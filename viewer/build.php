<?php

// if there are errors, we want to see them.

ini_set('display_errors', 1);
ini_set('html_errors', php_sapi_name() !== 'cli');
ini_set('error_logging', E_ALL);

// some handy constants

define('BUILD_DIR', 'build');
define('PHP_BUILD_DIR', BUILD_DIR . '/php');
define('HTML_BUILD_DIR', BUILD_DIR . '/html');

define('STANDALONE_DIR', '/standalone');
define('SHARED_DIR', '/shared');

define('IMAGES_DIR', '/images');
define('TEMPLATES_DIR', '/templates');

define('JAVA_APP_DIR', 'java-apps');

define('OLD_BROWSERS', 'MSIE 4-8');

// check PHP version

if(PHP_VERSION_ID < 50200)
    d('You need PHP 5.2 or later to build HxDoc Viewer.');

// start the clock

$startTime = microtime(true);

// make sure the working dir is hxdoc's root

chdir(dirname(__FILE__));

// hijack some of the viewer's code

require_once(PHP::SOURCE_FILE);

// method to format output messages

function formatOutput()
{
    if(!func_num_args())
        return '';

    $args = func_get_args();

    $newline = PHP_EOL;

    if($args[count($args) - 1] === false)
    {
        $newline = '';
        array_pop($args);
    }

    if(!count($args))
        return '';

    $ret = count($args) === 1
        ? $args[0]
        : call_user_func_array('sprintf', $args);

    return $ret . $newline;

}

// method to display output messages

function e()
{

    if(Switches::present(Switches::QUIET))
        return;
    
    $output = call_user_func_array('formatOutput', func_get_args());

    if(php_sapi_name() === 'cli')
        echo $output;

    else
    {
        echo htmlentities($output);
        flush();
        ob_flush();
    }

    return $output;
}

// method to display output message and terminate execution

function d()
{
    Switches::get(Switches::QUIET)->present = false;
    call_user_func_array('e', func_get_args());
    exit;
}

// switches

class Switches
{

    const HELP = 1;
    const NO_MINIFY = 2;
    const QUIET = 4;
    const CREATE_CACHES = 8;
    const COPY_EXAMPLES = 16;

    private static $all;

    public static function def($id, $short, $long, $description)
    {

        if(!isset(self::$all[$id]))
        {

            self::$all[$id] = new self;

            foreach(array('short', 'long', 'description') as $i)
                self::$all[$id]->$i = $$i;

        }
    }

    /**
     * Get a switch instance
     * @param int $id
     * @return Switches
     */
    public static function get($id)
    {
        return self::$all[$id];
    }

    /**
     * Get a switch by one of its properties.
     * @param string $property
     * @param string $value
     * @return Switches
     */
    public static function getBy($property, $value)
    {
        foreach(self::$all as $i)
            if($i->$property === $value)
                return $i;

        self::badSwitch($value);
    }

    public static function present($id)
    {
        return self::get($id)->present;
    }

    public static function showHelp()
    {

        Switches::get(Switches::HELP)->present = false;

        $maxLong = 0;

        foreach(self::$all as $i)
            $maxLong = max($maxLong, strlen($i->long));

        e('Usage: php %s [switches]', preg_replace('`.*[\\\\/]`', '', __FILE__));

        e("\nSwitches:\n");

        foreach(self::$all as $i)
            e('-%s  --%s  %s', $i->short, str_pad($i->long, $maxLong), $i->description);

        d('');
    }

    public static function badSwitch($switch, $noun = 'switch')
    {
        e("Unknown %s: '%s'\n", $noun, $switch);

        self::showHelp();
    }

    public $short;
    public $long;
    public $description;
    public $present = false;

}

Switches::def(Switches::CREATE_CACHES, 'c', 'create-caches', 'Create directories for server-side caching.');
Switches::def(Switches::COPY_EXAMPLES, 'e', 'copy-examples', 'Copy an example document to each build directory.');
Switches::def(Switches::HELP, 'h', 'help', 'Show this help screen.');
Switches::def(Switches::NO_MINIFY, 'n', 'no-minify', 'Skip JS and CSS minification.');
Switches::def(Switches::QUIET, 'q', 'quiet', 'Do not display progress information.');

foreach(php_sapi_name() === 'cli' ? array_slice($argv, 1) : array_keys($_GET) as $i)

    if(preg_match('`^--([-\w]+)$`', $i, $m))
        Switches::getBy('long', $m[1])->present = true;

    else if(preg_match('`^-([a-z]+)$`i', $i, $m))
        foreach(str_split($m[1]) as $k)
            Switches::getBy('short', $k)->present = true;

    else
        Switches::badSwitch($i, 'argument');

if(Switches::present(Switches::HELP))
    Switches::showHelp();

// method to delete an entire directory tree

function deleteRecursive($dir)
{
    if(is_dir($dir))
    {
        foreach(scandir($dir) as $i)
        {
            $path = "$dir/$i";

            if(is_file($path))
                @unlink($path);

            else if(is_dir($path) && $i != '.' && $i != '..')
                deleteRecursive($path);
        }
        @rmdir($dir);
    }
}

// non-command-line builds

if(php_sapi_name() !== 'cli')
{

    echo '<!doctype html><html><head><title>Build | HxDoc</title><meta charset="utf-8" /></head><body>';

    // for IE
    echo str_repeat(' ', 256) . "\n";

    echo "<h1>Building HxDoc</h1><h3>This may take some time...</h3><pre>\n";

}

// delete the build directory

e('Cleaning the build directory tree');
deleteRecursive(BUILD_DIR);

// make sure it's deleted.

if(is_dir(BUILD_DIR))
    d('Could not delete old build.');

// rebuild the build dir tree

$tree = array(

    BUILD_DIR,

    PHP_BUILD_DIR,
    PHP_BUILD_DIR . STANDALONE_DIR,
    PHP_BUILD_DIR . SHARED_DIR,
    PHP_BUILD_DIR . SHARED_DIR . IMAGES_DIR,
    PHP_BUILD_DIR . SHARED_DIR . TEMPLATES_DIR,

    HTML_BUILD_DIR,
    HTML_BUILD_DIR . STANDALONE_DIR,
    HTML_BUILD_DIR . SHARED_DIR,
    HTML_BUILD_DIR . SHARED_DIR . IMAGES_DIR

);

if(Switches::present(Switches::CREATE_CACHES))
    foreach(array(SHARED_DIR, STANDALONE_DIR) as $i)
        $tree[] = PHP_BUILD_DIR . $i . '/cache';

foreach($tree as $i)
{

    // create the directory

    e('Making %s', $i);
    @mkdir($i);

    // make sure it worked!

    if(!is_dir($i))
        d('Could not create directory %s', $i);

    // for strange VMWare arrangments and bad umasks, give us a fighting chance
    // at populating these dirs

    @chmod($i, 0700 | fileperms($i));
}

// methods to minify stuff

class Minify
{

    private static $cache = array();
    private static $startDownloadAt;
    private static $curlHandle;
    private static $compressors = array(
        // use yui compressor for css

        'css' => array(
            'app' => 'yui-compressor',
            'zipUrl' => 'http://yui.zenfs.com/releases/yuicompressor/yuicompressor-2.4.7.zip',
            'jarFile' => 'yuicompressor-2.4.7/build/yuicompressor-2.4.7.jar',
            'args' => '--charset UTF-8 --type css'
        ),
        // use google closure compiler for js (slightly better compression)

        'js' => array(
            'app' => 'closure-compiler',
            'zipUrl' => 'http://closure-compiler.googlecode.com/files/compiler-latest.zip',
            'jarFile' => 'compiler.jar',
            'args' => '--charset UTF-8 --warning_level QUIET --compilation_level SIMPLE_OPTIMIZATIONS'
        )
    );

    private static function curlProgress()
    {

        static $counter = 0;

        if(++$counter % 10 == 0)
            e('.', false);

        curl_setopt(self::$curlHandle, CURLOPT_TIMEOUT,
            max(10, time() - self::$startDownloadAt + 5));
    }

    private static function download($type)
    {

        static $tempFileName = 'download.zip';

        $compressor = self::$compressors[$type];

        $targetFile = JAVA_APP_DIR . '/' . $compressor['app'] . '.jar';

        if(is_file($targetFile))
            return;

        if(!is_dir(JAVA_APP_DIR))
            mkdir(JAVA_APP_DIR);

        $tempFile = fopen($tempFileName, 'w');

        self::$curlHandle = $ch = curl_init($compressor['zipUrl']);
        self::$startDownloadAt = time();

        curl_setopt_array($ch,
            array(
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 10,
            CURLOPT_NOPROGRESS => false,
            CURLOPT_PROGRESSFUNCTION => array(__CLASS__, 'curlProgress'),
            CURLOPT_FILE => $tempFile
        ));

        e('Downloading %s', $compressor['app'], false);

        curl_exec($ch);

        echo "\n";

        if(curl_errno($ch))
            d('Download failed: %s', curl_error($ch) );

        fclose($tempFile);

        if(!filesize($tempFileName))
            d('Download failed.');

        $archive = new ZipArchive;

        if($archive->open($tempFileName) === true)
        {

            $jarData = $archive->getFromName($compressor['jarFile']);
            $archive->close();

            if($jarData === false)
                d('Could not extract file %s', $compressor['jarFile']);

            file_put_contents($targetFile, $jarData);
        } else
            d('Could not open ZIP file.');

        @unlink($tempFileName);
    }

    public static function css(&$data)
    {
        return self::_minify($data, 'css');
    }

    public static function js(&$data)
    {
        return self::_minify($data, 'js');
    }

    private static function _minify(&$data, $type)
    {

        if(Switches::present(Switches::NO_MINIFY))
            return $data;

        $hash = md5($data, true);

        if(isset(self::$cache[$hash]))
            return self::$cache[$hash];
            
        self::download($type);

        extract(self::$compressors[$type]);

        static $io = array(
                0 => array('pipe', 'r'),
                1 => array('pipe', 'w'),
                2 => array('pipe', 'w')
            );

        e('Minifying %s bytes (%s)', strlen($data), $type);

        $proc = proc_open(
            sprintf('java -jar %s/%s.jar %s', JAVA_APP_DIR, $app, $args),
            $io,
            $pipes,
            dirname(__FILE__)
        );

        if($proc === false)
            d('Could not run Java. Please ensure the Java executable is on the path.');

        fwrite($pipes[0], $data);
        fclose($pipes[0]);

        $ret = trim(stream_get_contents($pipes[1]));
        fclose($pipes[1]);

        $errors = trim(stream_get_contents($pipes[2]));
        fclose($pipes[2]);

        if($errors)
            d('Minification reported errors:\n\n%s', $errors);

        proc_close($proc);

        return self::$cache[$hash] = trim($ret);
    }

    public static function collapseWhiteSpace(&$data)
    {

        if(Switches::present(Switches::NO_MINIFY))
            return $data;

        return preg_replace('`(\s)\s+`', '$1', $data);

    }

    public static function xml(&$data)
    {

        if(Switches::present(Switches::NO_MINIFY))
            return $data;

        $ret = preg_replace('`<!--.*?-->`', '', $data);

        return self::collapseWhiteSpace($ret);

    }

}

// templating

$templates = array();

$templatesDir = 'src/html/';

foreach(scandir($templatesDir) as $i)
    if(substr($i, -5) === '.html')
        $templates[$i] = HxDocTemplate::get($i)->path($templatesDir . $i);

function writeFile($fileName, &$data)
{

    e('Writing %s (%s bytes)', $fileName, strlen($data));

    file_put_contents($fileName, $data);

}

function loadFile($fileName, $fileType = 'file')
{

    if(!is_file($fileName))
        d('File not found: %s', $fileName);

    e('Reading %s %s', $fileType, $fileName);

    return file_get_contents($fileName);
    
}

// class for reading and compiling javascripts

class Scripts
{

    private static $loaded = false;
    private static $scripts = array();

    private static function load()
    {
        if(self::$loaded)
            return;

        self::$scripts['hx'] = self::loadFile('src/js/libraries/hx.js');

        $jquery = self::loadFile('src/js/libraries/jquery-1.7.1.js');

        $intercept = strrpos($jquery, '// Expose jQuery to');

        self::$scripts['jquery'] =
                'var jQuery = ' .
                substr($jquery, 0, $intercept) .
                'return jQuery})(window), $ = jQuery';

        foreach(array('core', 'widget', 'mouse', 'draggable') as $i)
            self::$scripts["jquery.ui.$i"] = self::loadFile("src/js/libraries/jquery.ui.$i.js");

        // protect licenses from removal during minification
        foreach(self::$scripts as &$i)
            $i = str_replace('/*!', "/**\n * @license", $i);

        foreach(glob("src/js/*.js") as $file)
        {
            self::$scripts[$file] = self::loadFile($file);

            // jQuery gets some special treatment

            if(($intercept = strrpos(self::$scripts[$file], '// Expose jQuery to')) !== false)
                self::$scripts[$file] =
                    'var jQuery = ' .
                    substr(self::$scripts[$file], 0, $intercept) .
                    'return jQuery})(window), $ = jQuery';
        }

        self::$loaded = true;
    }

    private static function loadFile($file)
    {
        return loadFile($file, 'script');
    }

    public static function combine($resources = null, $minify = true)
    {

        self::load();

        if(!$resources)
            $resources = new stdClass();

        $ret = "(function(window, document){\n\n" .
            "var baseName = location.href.replace(/[#?].*/, '').replace(/\.[^./]+$/, ''),\n".
            "resources = " .
            json_encode((object) $resources) . ";\n\n" .
            implode("\n\n;\n\n", self::$scripts) .
            '})(window, document)';

        return $minify
            ? Minify::js($ret)
            : $ret;
    }

}

// class for reading and compiling css

class Styles
{
    
    const SOURCE_DIR = 'src/css/';

    private static $styles = null;

    private static function load()
    {

        if(self::$styles !== null)
            return;

        self::$styles = array();

        foreach(scandir(self::SOURCE_DIR) as $i)
            if(substr($i, -4) === '.css')
                self::$styles[substr($i, 0, -4)] = self::loadFile(self::SOURCE_DIR . $i);
    }

    public static function combine($embedImages = false, $minify = true)
    {

        self::load();

        $ret = implode("\n\n", self::$styles);

        if($embedImages)
            self::embedImages($ret);

        return $minify
            ? Minify::css($ret)
            : $ret;
    }

    private static function loadFile($file)
    {
        e('Reading stylesheet %s', $file);
        return file_get_contents($file);
    }

    private static function embedImages(&$css)
    {
        foreach(Images::files() as $fileName => $data)
            $css = str_replace("url(images/$fileName)", "url(" . Images::dataUri($fileName) . ")", $css);
    }

    public static function get($name, $embedImages = false, $minify = true)
    {

        self::load();

        $ret = self::$styles[$name];

        if($embedImages)
            self::embedImages($ret);

        return $minify
            ? Minify::css($ret)
            : $ret;
        
    }

}

// class for reading and writing images

class Images
{

    const SOURCE_DIR = 'src/images/png/';

    private static $images = null;

    private static function load()
    {

        if(self::$images !== null)
            return;

        self::$images = array();

        foreach(scandir(self::SOURCE_DIR) as $i)
            if(substr($i, -4) === '.png')
            {
                e('Reading image %s', self::SOURCE_DIR . "/$i");
                self::$images[$i] = file_get_contents(self::SOURCE_DIR . "/$i");
            }
    }

    public static function files()
    {

        self::load();

        return self::$images;
    }

    public static function dataUri($fileName)
    {

        self::load();

        return 'data:image/png;base64,' . base64_encode(self::$images[$fileName]);
    }

    public static function writeTo($dir)
    {

        self::load();

        foreach(self::$images as $fileName => &$data)
        {
            e('Writing image %s/%s (%s bytes)', $dir, $fileName, strlen($data));
            file_put_contents("$dir/$fileName", $data);
        }
    }
}

// class for reading XSL template

class XSL
{

    const SOURCE_FILE = 'src/template/core.xsl';

    private static $template = null;

    private static function load()
    {

        if(self::$template === null)
        {
            e('Reading XSL template %s', self::SOURCE_FILE);
            self::$template = file_get_contents(self::SOURCE_FILE);
        }
    }

    public static function writeTo($file)
    {

        self::load();

        e('Writing XSL template %s (%s bytes)', $file, strlen(self::$template));

        file_put_contents($file, self::$template);

    }

    public static function data($minify = true)
    {

        self::load();

        return $minify
            ? Minify::xml(self::$template)
            : self::$template;

    }
}

// class for writing viewer PHP file

class PHP
{

    const SOURCE_FILE = 'src/php/core.php';

    private static $data = null;

    public static function writeTo($file, $resources, $templates, $minify = true)
    {

        if(self::$data === null)
        {
            e('Reading PHP script %s', self::SOURCE_FILE);
            self::$data = file_get_contents(self::SOURCE_FILE);
        }

        $out = $minify
            ? Minify::xml(self::$data)
            : self::$data;

        $newLines = ($minify && !Switches::present(Switches::NO_MINIFY))
            ? ''
            : PHP_EOL . PHP_EOL;

        foreach(array(
            'Resource' => $resources,
            'Template' => $templates
        ) as $className => $set)
            foreach($set as $k => $i)
                $out .= sprintf("%sHxDoc%s::get(%s)->%s(%s);",
                    $newLines,
                    $className,
                    var_export($k, true),
                    $i[0],
                    var_export($minify ? Minify::collapseWhiteSpace($i[1]) : $i[1], true)
                    );

        $out .= $newLines . 'HxDocViewer::$oldBrowsers = ' . var_export(OLD_BROWSERS, true) . ';';

        $out .= $newLines . "HxDocViewer::render();\n";

        e('Writing PHP script %s (%s bytes)', $file, strlen($out));

        file_put_contents($file, $out);
        
    }
}


/**
 * Shared Viewer (HTML)
 */

// write shared viewer

writeFile(HTML_BUILD_DIR . SHARED_DIR . '/hxdoc.html', HxDocTemplate::get(HxDocTemplate::CORE)
    ->set('title', 'HxDoc Viewer')
    ->set('scripts', '<script src="hxdoc.js" charset="utf-8"></script>')
    ->set('body', '')
    ->render()
    );

// write shared viewer script

writeFile(HTML_BUILD_DIR . SHARED_DIR . '/hxdoc.js', Scripts::combine(array(
    'oldBrowsers' => OLD_BROWSERS,
    'oldBrowserTemplate' => Minify::xml(HxDocTemplate::get(HxDocTemplate::OLD_BROWSER)->data())
)));

// write shared viewer styles

writeFile(HTML_BUILD_DIR . SHARED_DIR . '/hxdoc.css', Styles::combine());

// copy xsl template to shared viewer dir

XSL::writeTo(HTML_BUILD_DIR . SHARED_DIR . '/hxdoc.xsl');

// copy images to shared viewer dir

Images::writeTo(HTML_BUILD_DIR . SHARED_DIR . IMAGES_DIR);


/**
 * Standalone Viewer (HTML)
 */

writeFile(HTML_BUILD_DIR . STANDALONE_DIR . '/hxdoc.html', HxDocTemplate::get(HxDocTemplate::CORE)
    ->set('title', 'HxDoc Viewer')
    ->set('scripts', '<script>' . Scripts::combine(array(
            'css' => Styles::combine(true),
            'xsl' => XSL::data(true),
            'oldBrowsers' => OLD_BROWSERS,
            'oldBrowserTemplate' => Minify::xml(HxDocTemplate::get(HxDocTemplate::OLD_BROWSER)->data())
        )) . '</script>')
    ->set('body', '')
    ->render()
    );


/**
 * Shared Viewer (PHP)
 */

// write templates

$templateFiles = array();

foreach($templates as $k => $i)
{
    writeFile(PHP_BUILD_DIR . SHARED_DIR . TEMPLATES_DIR . '/' . $k, $i->data());
    $templateFiles[$k] = array('path', substr(TEMPLATES_DIR, 1) . '/' . $k);
}

PHP::writeTo(PHP_BUILD_DIR . SHARED_DIR . '/hxdoc.php', array(
    HxDocResource::CSS => array('path', 'hxdoc.css'),
    HxDocResource::JS  => array('path', 'hxdoc.js'),
    HxDocResource::XSL => array('path', 'hxdoc.xsl'),
    HxDocResource::XSD => array('path', 'hxdoc.xsd')
), $templateFiles);

writeFile(PHP_BUILD_DIR . SHARED_DIR . '/hxdoc.js', Scripts::combine());

writeFile(PHP_BUILD_DIR . SHARED_DIR . '/hxdoc.css', Styles::combine());

XSL::writeTo(PHP_BUILD_DIR . SHARED_DIR . '/hxdoc.xsl');

$schemaPath = '../hxdoc-0.1.xsd';
e('Reading schema file %s', $schemaPath);
$schemaData = file_get_contents($schemaPath);
$schemaData = Minify::xml($schemaData);

writeFile(PHP_BUILD_DIR . SHARED_DIR . '/hxdoc.xsd', $schemaData);

Images::writeTo(PHP_BUILD_DIR . SHARED_DIR . IMAGES_DIR);


/**
 * Standalone Viewer (PHP)
 */

$templateFiles = array();

foreach($templates as $k => $i)
    $templateFiles[$k] = array('data', $i->data());

PHP::writeTo(PHP_BUILD_DIR . STANDALONE_DIR . '/hxdoc.php', array(
    HxDocResource::CSS => array('data', Styles::get('errors', true)),
    HxDocResource::JS  => array('data', Scripts::combine(array(
        'css' => Styles::combine(true)
    ))),
    HxDocResource::XSL => array('data', XSL::data(true)),
    HxDocResource::XSD => array('data', $schemaData)
), $templateFiles);

if(Switches::present(Switches::COPY_EXAMPLES))
{

    $exampleData = loadFile('../examples/hx-js.xml', 'example document');

    foreach(array(HTML_BUILD_DIR, PHP_BUILD_DIR) as $i)
        foreach(array(SHARED_DIR, STANDALONE_DIR) as $k)
            writeFile("$i$k/hxdoc.xml", $exampleData);
    
}

e('Build complete in %s seconds.', number_format(microtime(true) - $startTime, 1));
