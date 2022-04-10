/**
 * функция отображение фильтров-счетчиков
 *
 *  - do not get invoked by eval@/list.load
 *
 */

import plugin/realtyList/list/filters.js

(function () {
	var filters = app.exports.realty.filters;


	//  построение фильтра для комнат
	function create_number_room( data ) {
		//
		//  param @pos {object} -element offset
		var getPosition = function (offset) {
			var $win = $(window);

			return [ offset.left - $win.scrollLeft(),
				offset.top - $win.scrollTop() ];
		};
		// описываем поведение диалога
		var setDialogue = function () {
			var $holder = filters.rooms_selected,
				width = {
					span_rows: $holder.children().filter( 'span' ).length,
					step: 190,
					max_column: 3
				},
				height = "auto",
				column = width.span_rows/6;

			if (column > width.max_column) {
				height = 250;
				column = width.max_column;
			}

			$holder.dialog({
				autoOpen: false,
				resizable: false,
				open: $.noop,
				height: height,
				width: (width.step * Math.ceil( column )+50)
			});

			$holder.on( 'click', function () {
				var offset = $( this ).offset();

				$holder.dialog({
					position: getPosition( offset )
				});
				$holder.dialog('open');
			});
		};


		var old_elem = $( "span[ id ]", filters.rooms_selected ),
			k = 0,
			getAttrID = function (k) {
				var $node = $( old_elem[ k ] );

				return $node.length ? $node.attr("id").match(/(\d+)$/)[0] : false;
			},
			i, len = data.length,
			item,
			refresh;

		for (i = 0; i < len; i += 1 ) {
			item = data[ i ].num_room;

			// Удаляем элементы, которые отсутсвуют в новом списке
			while( k < old_elem.length && getAttrID(k) < item ) {
				refresh = true;
				$(old_elem[k]).parent().remove();
				k += 1;
			}

			// Если удалили все ненужные элементы: добавим новый
			if( k >= old_elem.length || getAttrID(k) > item ) {
				refresh = true;
				// создаем и решаем куда его запихнуть
				var new_elem = $([ "<span>",
					"<input type='checkbox' id='input_number_room"+ item,
					"' name='number_room[" + item + "]' value='"+ item +"' >",
					"<label for='input_number_room"+ item +"' >"+ item +"&nbsp;</label>",
					"<span id='number_room"+ item +"' ></span>",
					"</span>"].join(''));

				if (k >= old_elem.length) {
					new_elem.appendTo( filters.rooms_selected );
				} else {
					new_elem.insertBefore( $(old_elem[k]).parent() );
				}
			} else {
				k += 1;
			}
		}

		while( k < old_elem.length) {
			refresh = true;
			$(old_elem[k]).parent().remove();
			k += 1;
		}

		if (refresh){
			setDialogue();
		}
	}



	var stem = {
		/**
		 * @private
		 *
		 * @param arr
		 * @param prop
		 * @param value
		 *
		 * @return {*}
		 *  возращает значение поля count для элемента со свойством из массива либо пустую строку
		 */
		getPropertyCountAttribute: function (arr, prop, value) {
			var i, len = arr.length,
				find, item;

			for (i = 0; i < len; ++i) {
				item = arr[ i ];

				if ( item[ prop ] == value ) {
					find = true;
					item = item.count;
					break;
				}
			}
			return (item && find) ? item : '';
		},
		/**
		 * @private
		 *  устанавливает количество найденных квартир по заданному фильтру в span[ id ]
		 *
		 * @param $holder
		 * @param {string} prop
		 * @param rows
		 * @param {boolean} rows_is_array - optional
		 */
		setIdCounters: function ($holder, prop, rows, rows_is_array) {
			var self = this,
				arr = rows_is_array ? rows : app.util.rowsToArrayOpt( rows );

			$( "span", $holder ).each( function () {
				var $ctx = $( this ),
					id = $ctx.attr( "id" );

				if ( id ) {
					id = id.match( /\d+$/i );
					$ctx.html( "&nbsp;" + self.getPropertyCountAttribute( arr, prop, id ) );
				}
			});
		},
		// Отображает кнопки для числа комнат
		//  проставляет disable если таких квартир нет
		createViewButtons: function () {
			var number_room = [],
				$inputs = $( "input", filters.rooms_view ),//but is not changed
				last_idx = $inputs[ $inputs.length -1 ].value,
				max;

			$( "input", filters.rooms_selected ).each( function () {
				number_room.push( this.value );
			});
			max = Math.max.apply( {}, number_room );

			$inputs.each( function (n, elem) {
				var $ctx = $( this ),
					not_has = $.inArray( this.value, number_room ) < 0;

				if ( (not_has && n != 0 && n < last_idx) || (n == last_idx && max < last_idx) ) {
					$ctx.button( "disable" );
				} else {
					$ctx.button( "enable") ;
				}
			});
		},
		updateData: function (data) {
			var prop = 'num_room',
				number_rooms = app.util.rowsToArrayOpt( data.number_room ),
				filter_rooms = app.util.rowsToArrayOpt( data.filter_room );

			//  строим checkbox для фильтра по комнатам
			create_number_room( filter_rooms );
			this.createViewButtons();

			this.setIdCounters( filters.rooms_selected, prop, number_rooms, true );
			this.setIdCounters( filters.rooms_control,  prop, number_rooms, true );

			//  устанавливает количество найденных квартир по количеству комнат
			this.setIdCounters( filters.rooms_view, prop, data.counter_number_room );

			this.updateMetroDistrict( data, 'id' );
			//app.exports.inform.allApplication(data.application)
			//app.event.run("list-application", );
		},

		//
		//  todo not work -? separate
		//
		updateMetroDistrict: function (data, prop) {
			//  устанавливаем количество найденных квартир по районам
			this.setIdCounters( $("#district_sel"),    prop, data.district );
			this.setIdCounters( $("#select-district"), prop, data.district );
			//  уставливаем количество найденных квартир по метро
			this.setIdCounters( $("#metro_sel"),       prop, data.metro );
			this.setIdCounters( $("#select-metro"),    prop, data.metro );
		}
	};


	app.exports.realty.ListFilters = {
		//
		//  app.plugin.realtyList.counter
		//
		updateByCounter: function (data) {
			stem.updateData( data );
		}
	};
}());