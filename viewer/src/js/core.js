if(resources.oldBrowsers && (new RegExp('/' + resources.oldBrowsers + '/')).test(navigator.userAgent)) {

    $(function(){
        $('body').html(resources.oldBrowserTemplate);
    });

    resources.applyCss = false;

} else {

    if(resources.applyCss)
        resources.applyCss();

    else
        resources.applyCss = true;

    $(function() {

        var processor, xsl, temp,
            doc = document,
            minWidth = 300,
            location = doc.location,
            queryString = location.search.match(/^\?([^:]+)$/),
            sourceFileName = queryString
                ? queryString[1]
                : baseName + '.xml',

            pages = {}, homePage,
            $window = $(window),
            loadXML = function(uri, index) {

                $.ajax(uri, {
                    cache: !$.browser.msie,
                    success: function(responseXML) {
                        loadXML[index] = responseXML;
                    }
                })

            },

            onSplitterDrag = function(event, ui) {

                var callee = arguments.callee,
                    splitter = $('.splitter'),
                    left = parseFloat(splitter.css('left')),
                    windowWidth,
                    domCache = callee.cache;

                if(!ui || left !== callee.left) {

                    if(!ui && left > (windowWidth = domCache.window.width() - minWidth))
                        splitter.css('left', (left = Math.max(0, windowWidth)) + 'px');

                    domCache.contents.width(left);

                    domCache.pages.css('margin-left', left + 7);
                    callee.left = left;
                }

            },

            setSplitterConstraint = function() {
                $('.splitter').draggable('option', 'containment', [0, 0, $window.width() - minWidth, 0]);
                onSplitterDrag();
            },

            onPollHash = function() {

                var callee = arguments.callee,
                    hash = location.hash,
                    parts, el,
                    listItems = callee.listItems;

                if(hash !== callee.hash) {

                    callee.hash = hash;

                    listItems.removeClass('active');

                    $('.page, .hxdoc > .home').detach();

                    parts = /^#?(.*?)(?:-\d+)?$/.exec(hash);

                    if(!parts[1])
                        homePage.prependTo('.hxdoc');

                    else if(parts[1] in pages) {
                        $(pages[parts[1]]).appendTo('.pages');
                        listItems
                        .find('a[href="#' + parts[1] + '"]')
                        .parent()
                        .addClass('active')
                        .end()
                        .parents('li')
                        .expandMembers(true);
                    }

                    else
                        {
                            /**
                            * @todo suggestions!
                            */
                        }

                    if(el = doc.getElementById(hash.substr(1)))
                        $window.scrollTop($(el).offset().top);

                    onSplitterDrag();

                }




            },

            loadUI = function() {

                var splitter,
                    mainMembers,
                    elementsOrder = [
                        'constant',
                        'variable',
                        'method',
                        'event',
                        'class',
                        'namespace'
                    ],
                    rankContentsItem = function(el) {
                        var ret = {t: '', r: 0},
                            i = elementsOrder.length,
                            classes = el.className;
                        if(classes) {
                            while(i--)
                                if(classes.indexOf(elementsOrder[i]) != -1)
                                    ret.r = i;
                            if(classes.indexOf('instance') != -1)
                                ret.r += 6;
                            ret.t = el.getElementsByTagName('a')[0].innerHTML.toLowerCase();
                        }
                        return ret;
                    };

                // fix escaped hrefs
    //            $('a[href^=#]').each(function() {
    //                this.href = unescape($(this).attr('href'));
    //            });

                // sort tables
                $('div:not(.arguments) > table tbody').sortChildren(function(a, b) {
                    var A = $('th', a).text().replace(/[^\w]/g, ' ').toLowerCase(),
                        B = $('th', b).text().replace(/[^\w]/g, ' ').toLowerCase();
                    return A < B ? -1 :
                        A > B ?  1 :
                        0;
                });

                // make room for splitter and search

                mainMembers = $('.contents')
                .css({
                    width: 250,
                    top: 37
                })

                // wrap contents lists for nicer transitions

                .find('ul.members')
                .wrap('<div class="listContainer">')

                // sort contents
                .sortChildren(function(a, b) {
                    var A = rankContentsItem(a),
                        B = rankContentsItem(b);
                    return A.r > B.r ?  1 :
                        A.r < B.r ? -1 :
                        A.t > B.t ?  1 :
                        A.r < B.t ? -1 :
                        0;
                })

                // add orbs, arrows and collapse anything >= second-level

                .find('> li')
                .find('> a')
                .before('<div class="orb"><div class="top"></div><div class="bottom"></div></div>')
                .end()
                .has('ul.members')
                .prepend('<a class="arrow" href="javascript:"><div></div></a>')
                .addClass('collapsed')
                .find('> .listContainer')
                .hide()

                // handlers for expand/collapse

                .end().end().end().end()
                .on('click', 'a.arrow', function(e) {

                    var $li = $(e.currentTarget).parent();

                    $li.expandMembers($li.hasClass('collapsed'));

                })

                // if there’s only one expandable thing top-level, expand it

                .find('ul.level1 > li')
                .has('ul.members');

                if(mainMembers.size() === 1)
                    mainMembers.expandMembers(true);

                // code language wrappers

                $('code:has(.language)')
                .wrap('<div class="code">')
                .find('.language')
                .each(function(){
                    $(this).parent().parent().prepend(this);
                });

                // set up hash poller
                setInterval(onPollHash, 100);

                // set up splitter

                splitter = $('<div>')
                    .attr('title', 'Drag left/right, or double-click to show/hide')
                    .addClass('splitter')
                    .appendTo('body')
                    .draggable({
                        axis: 'x',
                        drag: onSplitterDrag,
                        stop: onSplitterDrag
                    })
                    .on('dblclick', function() {
                        var left = parseFloat(splitter.css('left'));
                        if(left) {
                            splitter.data('lastLeft', left);
                            left = 0;
                        }
                        else
                            left = splitter.data('lastLeft') || 250;
                        splitter.animate(
                            {left: left},
                            {
                                step: onSplitterDrag,
                                duration: 300
                            }
                        );
                    })

                // set up the control bar

    //            if($window[0].bar)
                    bar();

                // set up dom cache for splitter dragging

                onSplitterDrag.cache = {
                    contents: $('.contents, .bar'),
                    pages: $('.pages, .hxdoc > .home'),
                    window: $window
                };

                $window.resize(setSplitterConstraint);

                setTimeout(setSplitterConstraint, 100);

                // dom cache for contents

                onPollHash.listItems = $('.contents ul.members > li');

                // clear pages

                $('.page')
                .each(function() {
                    pages[this.id] = this;
                })
                .detach();

                homePage = $('.hxdoc > .home').detach();

            },

            expandContentsItem = function() {

                var $li = $(this),
                    $container = $li.find('> div.listContainer'),
                    sliding = 'sliding',
                    expanded = !$li.hasClass('collapsed');

                if($li.hasClass(sliding) || ($container.css('display') === 'none') === expanded) {

                    $li.removeClass(sliding);

                    $container[expanded ? 'slideDown' : 'slideUp'](200, finishExpandingContentsItem);

                    $li.addClass(sliding);
                }


            },

            finishExpandingContentsItem = function() {

                $(this).parent().removeClass('sliding');

            };

        $.fn.extend({
            expandMembers: function(expanded) {

                return this.toggleClass('collapsed', !expanded).each(expandContentsItem);

            },
            sortChildren : function(callback) {
                return this.each(function() {
                    var t = this,
                        sorted = Array.prototype.slice.call(t.childNodes).sort(callback);
                    $(t).empty().append($(sorted));
                });
            }
        });

        if(xsl = resources.xsl) {

            if(window.DOMParser)
                xsl = (new DOMParser()).parseFromString(xsl, 'text/xml');

            else {
                temp = $('<xml>')[0];
                temp.loadXML(xsl);
                xsl = temp;
            }

        }

        if(!$('.hxdoc').size()) {

            loadXML(sourceFileName, 0);

            if(!xsl)
                loadXML(baseName + '.xsl', 1);

            $('body').ajaxStop(function(){

                if($window[0].XSLTProcessor) {
                    processor = new XSLTProcessor();
                    processor.importStylesheet(xsl || loadXML[1]);
                    this.appendChild(processor.transformToFragment(loadXML[0], doc));
                } else
                    this.innerHTML = loadXML[0].transformNode(xsl || loadXML[1]);

                loadUI();
            });

        } else
            loadUI();

    });

}