/**
 * realtyList - плагин для отображения списка
 *
 * utils
 * 
 **/
 
app.exports.realty.steal = (function () {
	var base = {
		//  по выбранным checkbox создает массив значений
		selectArray: function (block_id) {
			var items_query = "#" + block_id + " input:checked",
				i = 0,
				arr = [];

			$( items_query ).each( function (n, item) {
				i = arr.push( $( item ).attr( "value" ) );
			} );

			return $.toJSON( arr );
		},
		/**
		 * Например, для городов, метро и районов:
		 *      преобразует строки в массивы и добавляет пустой элемент
		 *
		 * @param data
		 * @param empty
		 */
		arrayToSelect: function (data, empty) {
			var empty_row = {
					id:'', name:'- Не указано -'
				},
				i, len = arguments.length,
				item;

			for (i = 1; i < len; i++) {
				item = arguments[ i ];

				if ( data[ item ] ) {
					data[ item ] = app.util.rowsToArrayOpt( data[ item ] );

					if ( empty ) {
						data[ item ].unshift( empty_row );
					}
				}
			}
		},
		/**
		 * под обновление карточки недвижимости
		 *
		 * @param {json} data
		 * @param {number} list_item_id -идентификатор карточки
		 *
		 * */
		parseRealtyLoadItem: function (data, list_item_id) {
			//  when get unresolved list_item_id
			if ( !data.id ) {
				dialogError( "Карточки недвижимости №" + list_item_id + " не существует", "Ошибка!", 1 );

				app.exports.hashclear();
				return false;
			}

			base.arrayToSelect( data, 1, "city_sel", "metro_sel", "district_sel" );
			base.arrayToSelect( data, 0, "currency_sel" );

			return data;
		}
	};

	var loadListItem = function (id, currency, callback) {
		var item_id = parseInt( id, 10 );

		$.post( "/api/realtyList/load", {
			id: item_id,
			currency: currency
		}, function (data) {
			if ( typeof data == "string" ) data = $.parseJSON( data );
			data = base.parseRealtyLoadItem( data, item_id );
			callback( data, item_id );
		} );
	};

	return {
		loadListItem: loadListItem,
		base: base
	};
}());