/**
 *
 */
console.log( '@metro_map > admin = '+ metros.rights.admin );

/**
 *
 * @param {object} map_block_params loader
 */
app.exports.metro[ 'MapLoader' ] = function (map_block_params) {
	$(function () {
		metros.$map.image.imageNavigator( $.extend( map_block_params, {
			//  add experimental params there
		}) );
	});
};





/**
 * 
 * @type {object}
 */
var metroDataPlugin = (function () {
	var rq = function (params) {
		$.post( "/api/metro/"+ params.url, params.options, function (data) {
			params.callback( $.parseJSON( data ), params );
		} );
	};

	var getCityId = function () {
		return (place && place.city_id) ? place.city_id : '50748';
	};

	return {
		//  id-position-count

		/**
		 * Загружает список станций метро
		 *  с указанием числа квартир( из базы )
		 *              и координат на схеме( меняются через updateItemPosition )
		 *
		 * @param {function} callback_ext - обработчик ответа
		 *
		 * @returns {array}
		 * [ {
                 x: null,
                 y: null,
                 count: 14,
                 id: 17,
                 name: Автово
             },...
		 ]
		 */
		loadList: function (callback_ext) {
            var verify = function (data) {//simple
                    return data && data.length;
                };

            rq({
                url: "load",
                options: {
                    city_id: getCityId()
                },
                callback: function (data) {
                    var arr = [],
                        test = verify( data );

                    if (test) {
                        callback_ext( arr.concat( data ) );
                    } else {
                        callback_ext( arr );
                    }
                }
            });
        },
        /**
         * сохраняет позицию станции на схеме
         *
         * @param id
         * @param x
         * @param y
         */
        updateItemPosition: function (id, x, y) {
            var coords = listItem.getPosition(x, y);

            rq({
                url: "store",
                options: $.extend( coords, {
                    id: id
                }),
                callback: function (data) {
                    console.log('stored@'+ coords.x +'::'+ coords.y);
                }
            });
        },
        deleteItemPosition: function (id, name) {
            rq({
                url: "store",
                options: { x:0, y:0,
                    id: id
                },
                callback: function (data) {
                    console.log('deleted@'+ id +'::'+ name);
                }
            });
        },
        //  name-lang

        addItemName: function (id, lang_id, name) {

        },
        removeItemName: function (id, lang_id) {

        }
    };
}());





/**
 * 
 * @type {object}
 */
var markStation = {
    value_stub: 20,
    getItemPropValue: function (idx, item, prop) {// idx is used with test
        var value;

        if (item && item.hasOwnProperty( prop )) {
            value = item[ prop ];
        }
        return value ? value : idx * this.value_stub;//todo remove value_stub
    },
    //   todo check on element
    outer_width: $.browser.opera ? 31 : 25,
    getPosition: function (item, idx, shift_order) {// pass idx to test unfilled
        var pos = {
                x: this.getItemPropValue( 0, item, 'x' ),
                y: this.getItemPropValue( 0, item, 'y' )
            },
            shift = {
                x: shift_order ? shift_order * this.outer_width : 0// test on y
            };

        return this.span_position
            .replace('{$left}', parseInt( pos.x, 10 ) - shift.x )
            .replace('{$top}', pos.y );//todo width modulo?
    },
    span_class: 'metro-station-map',
    span_class_visible: 'metro-station-map_active',
    //
    //  todo use href with coords for overlay filter?
    //
    span_tpl: [
        '<span class="{class} station{$idx} stationVisible{$order}" style="{style}"',
        ' title="{$title}">{$count}</span>'
    ].join(''),
    span_position: ' top:{$top}px; left:{$left}px; ',
    /**
     * Получить разметку элемента станции на схеме
     *
     * @param {number} idx - позиция в массиве данных
     * @param {object} item - описание свойств станции
     *
     * @param {object} params - параметры возвращаемой разметки
     * @param {string} params.class_mod - модификатор класса
     * @param {boolean} params.omit_style - не подставлять в стиль позиционирование
     *
     * @return {String}
     */
    getMarked: function (idx, item, params) {
        var count = this.getItemPropValue( idx, item, 'count' ),
            name = this.getItemPropValue( idx, item, 'name' ),
            id = this.getItemPropValue( idx, item, 'id' ),
            tpl = this.span_tpl,
            position_style;

        if (!params.omit_style) {
            position_style = this.getPosition( item, idx, params.order );
            tpl = tpl
                .replace('{style}', position_style );
        }
        return tpl
            .replace('{$idx}', id )
            .replace('{$order}', params.order )//   test on draggable
            .replace('{$title}', name )
            .replace('{$count}', count )
            .replace('{class}',  this.span_class + params.class_mod );
    },
    //  general-purpose
    //
    // @param {string} class_mod - модификатор класса элемента, начинается с '__'
    // @param {number} order_idx - порядковый номер в стеке вывода
    //
    getFilled: function (idx, item, class_mod, order_idx) {
        var item_html = this.getMarked( idx, item, {
                order: order_idx,
                class_mod: class_mod ? class_mod : '',
                omit_style: !!class_mod
            });

        if (class_mod === '__admin-tool') {
            item_html = item_html
                .replace('{style}', '');
        }

        return item_html;
    }
};





/**
 * todo bind to controller
 * @type {Object}
 */
var listItem = {    
    clear: function () {
        $( '.'+ markStation.span_class ).remove();

        this.had_dragged = false;
    },
    had_dragged: false,
    //
    //  delegate requests
    //
    store: function (item, pos, index) {
        var list_item = item,
            id = typeof item === 'object' ? item.id : item,
            coords;

        metroDataPlugin.updateItemPosition( id, pos.x, pos.y );

        if (index === undefined) {
            coords = this.getPosition( pos.x, pos.y, index );
            list_item.x = coords.x;
            list_item.y = coords.y;

            if (this.had_dragged === false) {
                this.clear();
            } else {
                return true;//todo delayClearPopulate
            }
        }
    },
    delete: function (item) {

        this.clear();
        if (item) {
            metroDataPlugin.deleteItemPosition( item.id, item.name );

            item.x = 0;
            item.y = 0;
        }
    },
    //
    //  настройки смещения - нужен алгоритм для их определния
    //
    left: -19,
    top: 5,
    /**
     *
     * @param {number} x - left составляющая позиционирования
     * @param {number} y - top составляющая позиционирования
     *
     * @param {number} index - индекс в видимом стеке
     *
     * @return {object} значения координат в базе данных
     */
    getPosition: function (x, y, index) {
        var direction = index !== undefined ? -1 : 1,
            coords = {
                x: Math.round( x + direction * this.left ),
                y: Math.round( y + direction * this.top )
            };

        if ( direction < 0 ) {
            coords.x += markStation.outer_width * index;
        }
        return coords;
    },
    add: {}
};





var navImage = {
    //  move to listItem constructor
    //
    list: [],
    delayClearPopulate: function () {
        var self = this,
            callback = function (data) {
                listItem.clear();

                self.list = data;
                self.populate();

                //console.log('hay delay')
            };

        metroDataPlugin.loadList( callback );
    },
    //
    storeItem: function (item, pos) {
        var wait;

        if (item && item.id && pos && pos.x && pos.y) {
            wait = listItem.store( item, pos );

            if (!wait) {
                this.populate();
            } else {
                this.delayClearPopulate();
            }
        }
    },
    deleteItem: function (idx) {
        var list = this.list;

        listItem.delete( list[ idx ] );
        this.populate();
    },
    //   by hand
    //
    offset_rect: {
        max: {
            left: 700,
            top: 500
        },
        min: {
            left: 135,
            top: 80
        }
    },
    testImageOffset: function (ctx_position) {
        var l = ctx_position.left,
            t = ctx_position.top,
            test = this.offset_rect;

        return (test.min.left < l && l < test.max.left)
            && (test.min.top < t && t < test.max.top );
    },
    //
    //
    waiterSetup: function (data) {
        //  on successful response
        if (data) {
            this.list = data;//test otherwise
        }
        this.waiterStep();
    },
    step: 125,
    waiterStep: function () {
        var proxy = $.proxy( this.waiterCheck, this );

        setTimeout( proxy, this.step );
    },
    waiterCheck: function (is_update) {
        var $image = $( '.navImage' ),
            $loader = $( '#loader' );

        if ( $image.length && $loader.length && $loader.css( 'display' ) === 'none' ) {
            this.init( $image );
        } else {
            this.waiterStep();
        }
    },
    $image: null,
    init: function ($image) {
        this.$image = $image;
        this.start_offset = $image.offset();

        this.populate( this.list );

    },
    getStationsMarked: function (list, callback) {//  todo select station
        var count = 0,
            items = [],
            item,
            html,
            i = 0,
            len = list.length;

        for (; i < len; i += 1) {
            item = list[ i ];

            if (item && item.x && item.y) {
                html = markStation.getFilled( i, item, '', count );

                if (count) {
                    items.push( html );
                } else {
                    //  preset on first
                    items.push( html );
                }

                count += 1;
            }
        }
        html = items.join('');
        return callback( $( html ) );
    },
    /**
     *
     * @param $ctx - контекст узла станции на схеме
     * @param {string} name - условное название для действия(test log)
     * @param callback
     */
    onStationAction: function ($ctx, name, callback) {
        var classes = $ctx.attr( 'class' ),
            idx = classes.match( /station(\d+)/ ),
            id = idx.length > 1 ? idx[ 1 ] : null,
            index;

        idx = classes.match( /stationVisible(\d+)/ );
        console.log( name +'@'+ id );

        if (id) {
            index = idx.length > 1 ? idx[ 1 ] : 0;
            callback( id, $ctx, index );
        }
    },
    //  with skip not positioned or empty
    //
    populate: function () {
        var $stations,
            self = this,
            //  borrow
            cls = markStation.span_class,
            cls_active = markStation.span_class_visible;

        this.getStationsMarked( this.list, function ($nodes) {
            return $nodes.insertBefore( self.$image );
        });

        $stations = $( '.'+ cls )
            .addClass( cls_active );

        if (metros.rights.edit) {
            $stations.draggable({
                stop: function () {
                    self.onStationAction( $( this ), 'update', function (id, $ctx, index) {
                        var coords = {
                            x: parseInt( $ctx.css('left'), 10 ),
                            y: parseInt( $ctx.css('top'), 10 )
                        };
                        //  unshift index
                        coords = listItem
                            .getPosition( coords.x, coords.y, index );

                        listItem.had_dragged = true;

                        metroDataPlugin.updateItemPosition(id, coords.x, coords.y );
                        //self.list[ index ].x = coords.x;
                        //self.list[ index ].y = coords.y;

                        //listItem.store( id, coords, index );
                    });
                }
            });
        } else {
            //  todo delegate?
            $stations.on( 'click', function () {
                self.onStationAction(  $( this ), 'query', function (id) {
                    var lister = app.exports.realty.list,
                        tab = lister.getCurrentPanel(),
                        options = tab.prop( "list_opt" ).param;

                    tab.listCreate({
                        param: $.extend( options, {
                            metro:("["+ id +"]"),//like.toJSON
                            city_id: place.city_id ? place.city_id : 0
                        } )
                    } ).list( "refresh" );

                    $( "#metro-map-ovl" ).dialog( "close" );
                });
            });
        }
    }
};





/**
 * main module
 *
 ...
    -[content]У станций метро должны стоять цифры, показывающие сколько там квартир.
    -[click able]При нажатии на станцию окно схемы исчезает, а в фильтре выбирается метро.

 admin::
    -Можно добавить наименование станции метро. При этом указывается язык и id станции.
 */
(function () {
    var required = app.exports.metro,
        host = required['getScript'],
        metro_data_callback = function (data) {

            navImage.waiterSetup( data );

            //  todo incorrect data split in between?

            required['populateStationNames']( data, {
                nav: navImage,
                station: markStation
            } );
        };

    $.getScript( host.url +'/map-view-select.js?'+ host.stamp, function(){
        metros.callbacks.on.push( function () {
            metroDataPlugin.loadList( metro_data_callback );
        });
    });
}());