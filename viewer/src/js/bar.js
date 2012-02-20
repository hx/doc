var bar = (function(){

    var $contents,
        $contentsItems,
        $searchContainer,
        $searchInput,
        index = {};

    return function(){

        var id,
            appendToIndex = function() {
                index[id].text += $(this).text().replace(/\s\s+/g, ' ').toLowerCase() + "\0";
            },

            querySplitPattern = /[^\w]+/,

            lastCollapsedSet,

            performSearch = function(query) {

                query = $.trim(query || '');

                if(query && !lastCollapsedSet)
                    lastCollapsedSet = $contentsItems.filter('.collapsed');

                else if(!query && lastCollapsedSet) {
                    lastCollapsedSet
                    .not('.active, :has(.active)')
                    .addClass('collapsed')
                    .children('.listContainer')
                    .hide();
                    lastCollapsedSet = null;
                }

                $contents.toggleClass('searching', !!query);
                $contentsItems.removeClass('hit containsHit');

                if(query) {
                    searchTerms = query.toLowerCase().split(querySplitPattern);
                    $.each(index, searchSingleEntry);
                }
            },

            searchTerms,

            searchSingleEntry = function(id, data) {
                var i = searchTerms.length;
                while(i--)
                    if(searchTerms[i] && data.text.indexOf(searchTerms[i]) === -1)
                        return;
                data.item
                .addClass('hit')
                .parents('ul.members > li')
                .addClass('containsHit')
                .expandMembers(true);
            },

            clearSearch = function() {
                $searchInput.val('').blur();
                performSearch();
            };

        ($contents = $('.contents'))
        .before('<div class="bar"><div class="persistent"><div class="search blank">' +
            '<div><input placeholder="Search"/></div><a href="javascript:" title="Clear">' +
            '<div></div></a></div><div class="dropdown"><a href="javascript:" ' +
            'title="Show/hide options"><div></div></a></div></div></div>');

        $contentsItems = $contents.find('ul.members > li');

        $('.page').each(function(){
            id = this.id;
            index[id] = {
                text: '',
                item: $('a[href="#' + id + '"]', $contentsItems).parent()
            };
            $('h2 > .name, > .summary, > .details, > .remarks',
                $(this).find('.overload')
                .andSelf()
            ).each(appendToIndex);
            
        });

        $searchContainer = $('.bar .search');

        $searchInput = $('.bar .search input')
        .on('focus', function() {
            $searchContainer.removeClass('blank');
        })
        .on('blur', function() {
            $searchContainer.toggleClass('blank', !this.value);
        })
        .on('keyup', function(e) {
            if(e.keyCode === 27)
                clearSearch();
            else
                performSearch(e.target.value);
        });

        $searchContainer.find('a').on('click', clearSearch);

    }

})();