/*$.ready( function () {
    var block = app.exports.loginPersonalBlock;

    // USECASE
    test("Блок личного кабинета", function () {
        var $control = $( '#settings_btn' ),
            height = block.getCurrentHeight();

        ok(true, "Successfully get loaded");

        if ($control.parent().css('display') != 'none') {
            //  tests before
            $control.click();
            ok(height == 0, "Was hidden at start" );

            //  after tests
            height = block.getCurrentHeight();
            ok(height > 0, "Is visible with show on click" );
        }
    });
}());*/



$.ready( function () {
    var block = app.plugin.metro,
        settings = {
            //  если был выбран конкретный тест - только один
            isSelected: function () {
                return $('#qunit-tests > li').length == 1;
            },
            init: function () {
                var $find = $('#start-find');

                if ( this.isSelected() ) {
                    $find.click();// apply state
                }
                ok(true, "Successfully get loaded "+ block );
            },
            next: function () {
            }
        },
        prot = {
            isAdminUser: function () {
                return false;
            }

        };

    //USECASE
    //test("Блок плагина метро", function () {
    asyncTest("Блок с плагином метро", function () {

        var $control = $('#metro-map-button'),
            $map = $('#metro-map'),//.parent() - #metro-map-ovl
            $before = $('#counter-number_room');

        //scenario
        settings.init();

        settings.next();
        start();
    });
}());



$.ready( function () {
    var block = app.exports.realty.block_beds,
        $panel = $( '#hb' ),
        settings = {
            //  если был выбран конкретный тест - только один
            isSelected: function () {
                return $('#qunit-tests > li').length == 1;
            },
            names: {
                start: '== Индивидуальные тесты ==\t',
                visible: 'Виден при поиске'
            },
            test: function () {
                var selected = this.isSelected();

                if ( selected ) {
                    ok(true, this.names.start + (selected ? 'selected' : 'none') );

                    this.next();
                } else {
                    start();
                }
            },
            step: 200,
            next: function () {
                if (this.notVisible( $panel ) ) {
                    setTimeout( $.proxy( this.next, this ), this.step );
                } else {
                    setTimeout( $.proxy( this.nextComplete(), this ), this.step );
                }
            },
            nextComplete: function() {
                ok( !this.notVisible( block.block ), this.names.visible );

                start();
            },
            notVisible: function ($node) {
                return $node.css('display') === 'none'
            }
        };

    asyncTest("Блок количества гостей", function () {

        ok( typeof block === 'object', "Код успешно выполнен" );

        settings.test();
    });
}());