<?php

// we need to know what goes wrong in xml land

ini_set('display_errors', 1);

libxml_use_internal_errors(true);

class HxDocViewer
{

    public static $defaultNamespace = '';

    public static $oldBrowsers;

    public static function flush($output)
    {
        $output = (string) $output;

        $hash = md5($output);

        header('Expires: ' . date('r', time() + 86400 * 90));
        header('Cache-Control:');
        header('Pragma:');
        header('Etag: ' . $hash);

        if(isset($_SERVER['HTTP_IF_NONE_MATCH']))
            if($_SERVER['HTTP_IF_NONE_MATCH'] === $hash)
                die(header('HTTP/1.0 304 Not Modified'));

        if(isset($_SERVER['HTTP_ACCEPT_ENCODING']))
            if(function_exists('gzencode') && preg_match('`\bgzip\b`', $_SERVER['HTTP_ACCEPT_ENCODING']))
            {
                header('Content-Encoding: gzip');
                $output = gzencode($output);
            }

        header('Content-Length: ' . strlen($output));

        die($output);
    }

    public static function render()
    {

        // system requirements

        if(!class_exists('XSLTProcessor'))
            HxDocErrors::halt('This application requires the <em>XSL Extension</em> for PHP 5. ' .
                'See <a href="http://php.net/XSLTProcessor">php.net/XSLTProcessor</a> for instructions.');


        // check if we're in an old browser

        if(preg_match('`' . self::$oldBrowsers . '`', $_SERVER['HTTP_USER_AGENT']))
            self::flush(HxDocTemplate::get(HxDocTemplate::CORE)
                ->set('body', HxDocTemplate::get(HxDocTemplate::OLD_BROWSER))
                ->set('title', 'HxDoc Viewer')
                ->set('scripts', '')
                ->render()
                );

        // load our source document

        $sourceDocument = new DOMDocument;

        $docResource = HxDocResource::get(HxDocResource::XML);

        HxDocCache::serveIfCached($docHash = $docResource->hash());

        if($docResource->hasData())
            $sourceDocument->loadXML($docResource->data());

        else
        {

            if($docResource->path() === null)
            {

                $queryString = $_SERVER['QUERY_STRING'];

                $docResource->path(preg_match('`^(\w(\.?[\w-])*/)?\w(\.?[\w-])*\.xml$`i', $queryString)
                    ? $queryString
                    : preg_replace('`\.php$`i', '.xml', __FILE__)
                    );

            }

            HxDocCache::serveIfCached($docHash = $docResource->hash());
            
            if($docResource->fileExists())
                $sourceDocument->load($docResource->path());

            else
                HxDocErrors::halt('Could not find the source document.');
        }

        // make sure the source doc loaded

        HxDocErrors::checkForXmlErrors();

        // we need a namespace for our xpath queries, and also to remove from
        // error messages for neatness

        self::$defaultNamespace = $sourceDocument->documentElement->getAttribute('xmlns');

        // tee up the schema

        $schemaResource = HxDocResource::get(HxDocResource::XSD);

        if($schemaResource->hasData())
            $sourceDocument->schemaValidateSource($schemaResource->data());

        else if($schemaResource->fileExists())
            $sourceDocument->schemaValidate($schemaResource->path());

        else
            HxDocErrors::halt('Could not find the document schema file.');

        // make sure the doc validated

        HxDocErrors::checkForXmlErrors();

        // create an object for querying the source doc with xpath

        $xpath = new DOMXPath($sourceDocument);

        // register the default namespace

        $xpath->registerNamespace('hx', self::$defaultNamespace);

        // make sure all the IDs are unique (the schema can't do this for us)

        $ids = array();

        foreach($xpath->query('//*[@id]/@id') as $i)
            $ids[] = $i->value;

        foreach($xpath->query('//hx:internal/text()') as $i)
            if(array_search($i->wholeText, $ids) === false)
                HxDocErrors::halt("An internal link references a member with an ID of <em>$i->wholeText</em>, but no such member is defined.");
        
        // tee up the XSL template

        $xslt = new XSLTProcessor;

        $xslResource = HxDocResource::get(HxDocResource::XSL);

        if($xslResource->hasData() || $xslResource->fileExists())
            $xslt->importStylesheet(new SimpleXMLElement($xslResource->data()));

        else
            HxDocErrors::halt('Could not find the transformation template file.');

        // perform the transformation

        $htmlDoc = $xslt->transformToDoc($sourceDocument);

        // prepare the output

        $output = HxDocTemplate::get(HxDocTemplate::CORE);


        /**
         * @todo make this the source document's name
         */

        // set the page title

        $output->set('title', $xpath->query('/hx:package/hx:name/text()')->item(0)->wholeText);

        // set the page script

        $scriptResource = HxDocResource::get(HxDocResource::JS);

        if($scriptResource->hasData())
            $output->set('scripts', sprintf('<script>%s</script>', $scriptResource->data()));

        else if($scriptResource->fileExists())
            $output->set('scripts', sprintf('<script src="%s" charset="utf-8"></script>', $scriptResource->path()));

        else
            HxDocErrors::halt('Could not find viewer script file.');

        // set the page body

        $output->set('body', $htmlDoc->saveHTML());

        // wind it up

        $output = (string) $output;

        HxDocCache::save($docHash, $output);

        self::flush($output);

    }
    
}

class HxDocCache
{

    const DIR = 'cache';

    private static $enabled = null;

    private static function enabled()
    {

        if(self::$enabled === null)
        {
            self::$enabled = false;
            if(is_dir(self::DIR))
                if(is_readable(self::DIR) && is_writable(self::DIR))
                    self::$enabled = true;
        }

        return self::$enabled;

    }

    public static function serveIfCached($key)
    {
        
        if(!$key || !self::enabled())
            return;

        $file = self::DIR . '/' . $key;

        if(is_file($file))
            HxDocViewer::flush(file_get_contents($file));

    }

    public static function save($key, &$data)
    {

        if(self::enabled())
            file_put_contents(self::DIR . '/' . $key, $data);

    }
}

class HxDocResource
{

    const CSS = 'css';
    const JS = 'js';
    const XML = 'xml';
    const XSD = 'xsd';
    const XSL = 'xsl';

    protected static $cache = array();

    /**
     * Get a resource instance
     * @param string $id The resource ID
     * @return HxDocResource
     */
    public static function get($id)
    {

        if(!isset(self::$cache[$id]))
            self::$cache[$id] = new self($id);

        return self::$cache[$id];

    }

    private $id = null;

    /**
     * Path to a file containing the resource data
     * @var string
     */
    private $path = null;

    /**
     * The resource data
     * @var string
     */
    private $data = null;

    private $hash = null;

    protected function __construct($id)
    {
        $this->id = $id;
    }

    public function path($newPath = null)
    {
        if($newPath !== null)
        {
            $this->path = $newPath;
            return $this;
        }

        return $this->path;
    }

    public function data($newData = null)
    {

        if($newData !== null)
        {
            $this->data = $newData;
            return $this;
        }

        if(!$this->hasData() && $this->fileExists())
            $this->data = file_get_contents($this->path);

        return $this->data;
    }

    public function hasData()
    {
        return $this->data !== null;
    }

    public function fileExists()
    {
        return is_file($this->path);
    }

    public function hash()
    {
        if($this->hash === null)
        {
            
            if($this->hasData())
                $this->hash = sha1($this->data());

            else if($this->fileExists())
                $this->hash = sha1_file($this->path());

        }

        return $this->hash;
    }
}

class HxDocTemplate extends HxDocResource
{

    const CORE = 'core.html';
    const ERRORS = 'errors.html';
    const OLD_BROWSER = 'old-browser.html';

    public static function get($id)
    {

        if(!isset(self::$cache[$id]))
            self::$cache[$id] = new self($id);

        return self::$cache[$id];
        
    }
    
    private $values = array();

    public function set($name, $value)
    {
        $this->values[$name] = $value;
        return $this;
    }

    public function render()
    {

        $ret = $this->data();

        foreach($this->values as $k => $i)
            $ret = str_replace("{{$k}}", (string) $i, $ret);

        return trim($ret);
        
    }

    public function __toString()
    {
        return $this->render();
    }
}

class HxDocErrors
{

    private static $errors = array();

    /**
     * Number of lines to display before and after erroneous lines.
     * @type integer
     */
    public static $contextLines = 3;

    /**
     * Halt execution and display an error message.
     * @param string $message The message to be displayed, as HTML.
     */
    public static function halt($message)
    {

        $details = '';

        if(!empty(self::$errors))
            $lines = explode("\n", HxDocResource::get(HxDocResource::XML)->data());

        foreach(self::$errors as $error) {

            $focusLines = array(intval($error->line));

            $localMessage = str_replace('{' . HxDocViewer::$defaultNamespace . '}', '', $error->message);

            preg_match_all('`\bline (\d+)`', $localMessage, $matches, PREG_SET_ORDER);

            foreach($matches as $i)
                $focusLines[] = intval($i[1]);

            $displayLines = array();
            foreach($focusLines as $i)
                for($k = max(1, $i - self::$contextLines); $k <= min(count($lines), $i + self::$contextLines); ++$k)
                    $displayLines[] = $k;

            natsort($displayLines);
            $displayLines = array_values(array_unique($displayLines));

            $details .= sprintf('<dl><dt>Line</dt><dd class="line">%s</dd><dt>Problem</dt><dd class="problem">%s</dd></dl>',
                $line = $error->line,
                preg_replace(
                    '`\bline (\d+)`',
                    '<span class="lineRef">line <span class="number">$1</span></span>',
                    htmlentities($localMessage, null, 'UTF-8')
                    )
            );

            $details .= '<div class="badCode">';

            foreach($displayLines as $k => $i)
            {
                if($k && $displayLines[$k - 1] !== $i - 1)
                    $details .= '<div class="line gap"><span>···</span></div>';
                $details .= sprintf('<div class="line%s"><span>%s</span>%s</div>',
                    array_search($i, $focusLines) === false ? '' : ' focus',
                    $i,
                    htmlentities($lines[$i - 1], null, 'UTF-8')
                    );
            }

            $details .= '</div>';

        }

        $cssResource = HxDocResource::get(HxDocResource::CSS);
        
        HxDocViewer::flush(HxDocTemplate::get(HxDocTemplate::CORE)
            ->set('title', 'Error | HxDoc Viewer')
            ->set('scripts', $cssResource->fileExists()
                ? sprintf('<link rel="stylesheet" href="%s"/>', $cssResource->path())
                : sprintf('<style>%s</style>', $cssResource->data())
                )
            ->set('body',
                HxDocTemplate::get(HxDocTemplate::ERRORS)
                    ->set('message', $message)
                    ->set('details', $details)
                )
            );
        
    }

    public static function add($line, $message)
    {
        self::$errors[] = (object) array(
            'line' => $line,
            'message' => $message
        );
    }

    public static function checkForXmlErrors()
    {
        $errors = libxml_get_errors();
        
        if(!empty($errors))
        {
            self::$errors = $errors;
            self::halt("The XML file <em>" . preg_replace('`.*/`', '', HxDocResource::get(HxDocResource::XML)->path())
                . "</em> isn’t a valid HxDoc 1.0 document. Here’s everything we know:");
        }
    }
}
