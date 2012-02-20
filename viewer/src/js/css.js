var applyCss = function(){

    var sheet = hx.StyleSheet(),

        tableColours = {
//                      head                        body
//                      top    middle bottom border bg     border vertical
        '' : {
            arguments: '69a9ca 468fb8 296b9b 296b9b f7fcfd b1d1da e0eff2',
            exceptions:'a20808 820303 610101 540000 fdf7f7 d69292 f2dbdb',
            namespaces:'7d7d7d 585858 3b3b3b 525252 fafafa d9d9d9 eee',
            classes:   '5785c0 3464ab 1d418b 294c9b f7f9fd b1c0da e4e9f3',
            methods:   '38a22f 1c8617 0d610b 399321 f7fdf7 c7d8c3 eaf3e9',
            events:    '9c7bb8 7f59a2 5a387f 49299b f9f7fd c0b1da e9e4f3',
            constants: 'b84f69 a22d46 7f1729 96193f fdf7f9 e4c7ce f6eaed',
            variables: 'e09316 d5740a c05004 af6312 fdfbf7 ead6c3 f8f1e9'
        },

//                      head                        body
//                      top    middle bottom border bg     border vertical
        '.members.static > ' : {
            namespaces:'a1a1a1 818181 606060 525252 fafafa d9d9d9 eee',
            classes:   '61a7b6 3f8ba0 276680 337390 f7fbfc b5ced6 e5eef2',
            methods:   '899740 6b7c28 4c5a19 868831 fcfcf7 d5d6c6 f0f1ea',
            events:    'a78aa9 8c6b90 68496d 6c457f faf8fb cbbbd0 ede7ef',
            constants: 'ad767f 985a62 7b4449 8c4a59 fcf9f9 e2d3d5 f5eef0',
            variables: 'e8ca2f daae0c b98100 c19700 fefef6 f0e3bc faf6e5'
        }},

        tablesTemplate =

'. thead th {\
    background: #1;\
    background: linear-gradient(top, #0 0,#1 50%, #2 100%);\
    border-top-color: #3;\
}\
. thead th:first-child {\
    border-left-color: #3;\
}\
. thead th:last-child {\
    border-right-color: #3;\
}\
. tbody tr > :last-child {\
    border-right-color: #5;\
}\
. tbody tr > * {\
    border-color: #5;\
    border-right-color: #6;\
    background: #4;\
}',

        prefix, type;

    for(prefix in tableColours)
        for(type in tableColours[prefix])
            sheet.append(
                tablesTemplate
                    .replace(/\./g, prefix + '.' + type)
                    .replace(/#(\d)/g, function(undefined, index){
                        return '#' + tableColours[prefix][type].split(/\s+/)[parseInt(index)]
                    }));

    if(resources.css)
        sheet.append(resources.css);

    else
        $.ajax(baseName + '.css', {
            success: function(a, b, xhr) {
                sheet.append(xhr.responseText);
            },
            async: false,
            cache: false
        });

    sheet
    .backfit()
    .apply();

};

if(resources.applyCss)
    applyCss();

else
    resources.applyCss = applyCss;
