/**
 *	Фильтры
 *
 */
import plugin/realtyList/equipment.js
import plugin/realtyList/realty_utils.js
 
(function () {

	app.exports.realty.features = {
		//  переключатель по типу - комната, квартира, коттедж - form_id
		//
		selectAbode: {
			$node: $( "#select-form-id" ),
			callbackOnChange: $.noop,
			updateSelected:function (idx) {
				var $options = $( 'option', this.$node );

				$options.eq( 0 ).removeAttr( 'selected' );
				$options.eq( idx ).attr( 'selected', 'selected' );
			},
			init:function (preset) {
				var self = this;
				
				this.$node.setFormData( {
					form_id:null
				} );

				if ( preset ) {
					this.updateSelected( preset );
				}

				$( "select", this.$node ).on( 'change', function () {
					self.callbackOnChange( this.value );
				} );
			}
		},
		scroll__:function () {
		}//   todo
	};

}());



/**
 *
 *
 */
(function () {
	var rent = app.exports.realty;

	/**
	 *
	 <div#flt-guests>
	 <label for="number-bed">Гости</label><br>
	 <select#number-bed data="{max:10}">
	 */
	(function () {
		var $block = $( '#flt-guests' ),
			$select = $( '#number-bed' ),
			params = $.parseJSON( $select.attr( 'data' ) ),
			has_max = typeof params === 'object' && params.hasOwnProperty( 'max' );

		rent.block_beds = {
			block: $block,
			select: $select,
			max: has_max ? params.max : params[ 0 ],
			previous: $( '#flt-date' )
		};
	}());


	rent.bedsHolder = {
		//
		holder: rent.block_beds,
		show: function () {
			var holder = this.holder;

			holder.previous
				.append( holder.block.show() );
		},
		//
		list_controller_name: 'number_bed',
		//
		applyChanger: function( $ctx ) {
			var value = this.holder.select.val();

			rent.list.getCurrentPanel().list( 'update', {
				number_bed: value
			} );
		},
		init: function () {
			var self = this;

			this.populate( app.overlay.use_list_params );

			this.holder.select.on( 'change', function () {
				self.applyChanger( $(this) );
			});
			this.show();
		},
		populate: function ( use_params ) {
			var $block = this.holder.select,
				token = 'selected',
				$selected = $block.find( 'option' ).eq(0),
				$clone = $selected.clone().removeAttr( token ),
				prop = this.list_controller_name,
				idx = 1,
				len = this.holder.max;

			for (; idx < len; idx += 1) {
				$block.append( $clone.clone().attr( 'value', idx ).text( idx ) );
			}

			//  and switch selected
			idx = parseInt( use_params[ prop ], 10 );
			if ( !isNaN( idx ) && idx > 0 && use_params.hasOwnProperty( prop ) ) {
				this.applyBlockSelected( $block, $selected, token, idx );
			}
		},
		applyBlockSelected: function ($block, $selected, token, idx) {
			$selected.removeAttr( token );
			$( 'option', $block ).eq( idx ).attr( token, token );

			//  ffie workaround
			$block.html( $block.html().toLowerCase()
				.replace( /selected=\"\"/g, '') );
		}
	};

}());




/**
 *
 *
 */
(function () {
	var rent = app.exports.realty;

	/**
	 * filters dependencies
	 * ===================================================
	 *
	 */
	//  построение списка для выбранных элементов фильтра
	var create_select = function (name) {
		function filterUpdateList( name, has_checked ) {
			var $div = $( "#filter-select-"+ name );

			//  отобразить div c выбран(ными по) фильтра(м) значения(ми)
			$div[ has_checked ? 'show' : 'hide' ]();

			filters.updateList();
		}

		var $fill_select = $( "#select-"+ name ).empty(),//????
			$sel_input = $( "#"+ name +"_sel input" ),
			$sel_input_checked = $sel_input.filter( ':checked' );

		$sel_input_checked.each( function () {
			var $ctx = $(this),
				$parent = $ctx.parent(),
				id = $parent.find("span").attr( "id" );

			$(["<span>"+$parent.find("label").text(),
				"<span id="+ id +"></span>",
				"<div id='select-"+ (name + $ctx.val()) +"'></div></span>"
			].join(''))
				.appendTo( $fill_select );
		});

		filterUpdateList( name, $sel_input_checked.length );


		$( "div", $fill_select ).on( 'click', function () {
			var $ctx = $( this ),
				id = $ctx.attr( "id" ).match(/\d+$/i)[0];

			//$("#"+name+"_sel input[ name="+name+"][ value="+ id +" ]");//for what?
			$sel_input
				.filter( "[ value="+ id +" ]" )
				.prop( "checked", false );

			$ctx.parent()
				.remove();
			filterUpdateList( name, $sel_input.filter( ':checked' ).length );
		});
	};



	//
	//  separate filters
	//
	var filters = {
		holder: $( "#hb" ),//  todo trace left & right
		rooms_view: $( "#counter-number_room" ),
		rooms_selected: $( '#number_room_sel' ),
		rooms_control: $( '#select-number_room' ),

		classes: {
			active_label: 'ui-state-active',
			active_equip: 'app-equipment-active'
		},
		attach: {
			changeLabel: function ($ctx, id, active ) {
				if ( $ctx.attr("id") == id ) {
					$ctx.removeClass( active );
				}
			},
			changeLabels: function (self, id) {
				self.labels.each( function () {
					self.attach.changeLabel( $(this), id, self.classes.active_label );
				});
			},
			//  проставляем выбранную вкладку в checkbox
			changeNumberSelected: function (self, value) {
				var values = {
					first: $("input:first", self.rooms_view ).val(),
					last: $("input:last", self.rooms_view ).val()
				};

				$("input", self.rooms_selected ).each(function () {
					var $ctx = $( this ),
						value_ctx = $ctx.attr("value");

					$ctx.prop( "checked", false );
					// ? why not unchecked on else
					if ( (value_ctx == value
						&& value > values.first
						&& value < values.last)
						|| (value_ctx >= value && value == values.last) ) {

						$ctx.prop( "checked", "checked" );
					}
				});
			},
			//  функция для работы по вкладкам (кнопки для количества комнат в квартирах)
			changeInputs: function (self) {
				self.inputs.change( function () {
					var $ctx = $( this ),
						id = $ctx.attr( "id" ),
						selected = self.inputs.filter(":checked").val();

					$ctx.addClass( self.classes.active_label );

					self.attach.changeLabels( self, id );
					self.attach.changeNumberSelected( self, selected );

					create_select( "number_room" );
				});
			}
		},
		orders: {
			$filter: null,
			$inputs: null,
			$inputs_checkbox: null,
			$order: null,
			updateByChecked: function ($ctx) {
				var value = this.$order.children( '*' ).filter( ':checked' ),//$( "#realty-list-order :checked").val(),
					has_checked = $ctx.prop( "checked" );

				//  выбрана сортировка по району( button )
				if ( has_checked ) {
					value = $ctx.val() +","+ value;
				}

				filters.updateList({
					order: value
				});
			},
			checkOff: function ($node, name_id, msgs) {
				if ( msgs ) {
					dialogError( msgs[ name_id ] );
				}

				$("label[ for="+ name_id +" ]", this.$filter )
					.removeClass( "ui-state-active ui-state-focus ui-state-hover" );

				$node.attr( "checked", false );
			},
			init: function () {
				var self = this;

				this.$filter = $( '#realty-filter' );
				this.$inputs = $( 'input[ id ]', this.$filter );
				this.$inputs_checkbox = this.$inputs.filter( '[ type=checkbox ]' );
				this.$order = $( '#realty-list-order' );//of realty all

				//  инициализация кнопок сортировок списков
				//
				this.$order.children( '*' ).filter( ':radio' )
					.on( 'change', function () {
					var $get_checked = self.$inputs.filter( ':checked' ),
						value = this.value;

					value = $get_checked.length ? (value +","+ $get_checked.val()) : value;

					filters.updateList({
						order: value
					});
				});

				//
				//  сортировка по метро и районам
				//
				this.$inputs_checkbox
					.on( 'change', function () {
						var $ctx = $( this ),
							current_id = $ctx.attr( "id" ),
							errors = {
								'district-order': "Выберите из списка районы по которым должна проходить сортировка",
								'metro-order': "Выберите из списка станции метро по которым должна проходить сортировка"
							};

						self.$inputs.filter( '[ type=checkbox ]' )
							.each( function (idx, item) {
								var id = this.id;

								if ( id !== current_id ) {
									self.checkOff( $( item ), id );
								}
							});

						if ( current_id === "district-order" && !$("#district_sel input:checked").length ) {
							self.checkOff( $ctx, current_id, errors );
						}
						if ( current_id === "metro-order" && !$("#metro_sel input:checked").length ) {
							self.checkOff( $ctx, current_id, errors );
						}

						self.updateByChecked( $ctx );
					});
			}
		},
		prices: {
			init: function () {
				var max = 10001,
					inf = "10000+",
					ranges = [
						$( "#relaty-list-range0" ),
						$( "#relaty-list-range1" )
					],
					$slider = $( "#realty-list-range" );

				$slider.slider({
					range: true,
					min: 0,
					max: max,
					values: [ 0, max ],
					slide: function (event, ui) {
						var v = ui.values[ 0 ];

						ranges[0].val( v );

						v = ui.values[ 1 ];
						ranges[1].val( v == max ? inf: v );
					},
					change: function (event, ui) {
						var v = ranges[1].val();

						filters.updateList({
							cena_from: ranges[0].val(),
							cena_to: v == inf ? '' : v
						});
					}
				});

				(function(i) {
					function ev() {
						var value = r.val();

						$slider.slider( "values", i, value == inf ? max : value );
					}
					var v = $slider.slider( "values", i );

					ranges[ i ]
						.val( v == max ? inf : v )
						.on( 'keyup', ev )
						.on( "input", ev );

					return arguments.callee;
				}(0))(1);
			}
		},
		init: function () {
			var $room = this.rooms_view;

			$.extend( this, {
				labels: $( "label", $room ),
				inputs: $( "input", $room )
			});
			this.attach.changeInputs( this );

			$room.appendTo( this.holder );

			rent.serviceInformers.init( function ($informers_node) {
				$room.before( $informers_node );
			});

			$room.show();

			localMetroDistrict.init();// not work yet

			this.prices.init();
			this.orders.init();
			this.createEquipmentFilter()
		},
		equipment: $( '#filter-equipment' ),
		/**
		 *
		 * @param equip_code -1 по умолчанию
		 */
		createEquipmentFilter: function ( equip_code ) {
			var self = this;

			rent.shorts.createEquipmentWidget( this.equipment, equip_code, function (value) {
				//$.proxy( this.updateList ) suppressed for callback -  value is not param_obj
				self.updateList();
			});
		},
		stealArray: function (name) {
			return rent.steal.base.selectArray( name );
		},
		getListParams: function (param_obj) {
			var equip = this.equipment.attr("equip_code");

			return $.extend( {
				currency: rent.getCurrency(),
				equipment: !equip ? 0 : equip,
				//  variables
				district: this.stealArray( "district_sel" ),
				number_room: this.stealArray( "number_room_sel" ),
				metro: this.stealArray( "metro_sel" )
			}, param_obj );
		},
		//  обновляем список недвижимости
		//
		updateList: function (param_obj) {
			rent.list.getCurrentPanel()
				.list( 'update', this.getListParams( param_obj ) );
		}
	};
	rent.filters = filters;



	var localMetroDistrict = {
		//
		parentalSwapSelects: function (self, prev, input) {
			var parent = {},
				index = {};

			index.self = input.index( self );
			index.prev = input.index( prev );

			//  то поменять местами элементы
			if ( index.self < index.prev ) {
				parent.prev = self.parent();
				parent.self = prev.parent();

				parent.prev.clone()
					.insertBefore( parent.self );
				parent.self.clone()
					.insertBefore( parent.prev );

				parent.prev.remove();
				parent.self.remove();
			}
		},
		getAttributeId: function ($node, isnt_numeric) {
			var value = $node.attr( "id" );

			if ( isnt_numeric ) {
				value = value.match( /[a-z]*$/ );
			} else {
				value = value.match( /\d+$/i );
			}

			return value;
		},
		eachDivSelects: function (prev, $ctx, inputs, $select) {
			var self,
				self_id = this.getAttributeId( $ctx ),
				prev_id = $ctx.parent().prev();

			if ( prev ) {
				prev_id = this.getAttributeId( prev_id.find( "div" ) );

				self = $("input[ value="+ self_id +" ]", $select );
				prev = $("input[ value="+ prev_id +" ]", $select );

				this.parentalSwapSelects( self, prev, inputs );
			} else {
				prev = $ctx;
			}

			return prev;
		},
		//
		//  получить позицию элемента
		//
		updateSelects: function ($node, that, name, $select) {
			var prev,
				$inputs = $( "input[ value ]", $select );

			$node.find( "div" ).each( function () {
				prev = that.eachDivSelects( prev, $( this ), $inputs, $select );
			} );

			if ( $( name + "-order input" ).prop( "checked", "checked" ) ) {
				filters.updateList();
			}
		},
		//  перемещение элементов списков метро и районов
		createSortable: function () {
			var self = this;
			//$( "#district_sel, #metro_sel" ).sortable({
			//    update: function (event, ui) {
			//        var name = $( this ).attr("id").match(/^.[^\_]*/);
			//        create_select( name );
			//    }
			//});
			$('#select-district, #select-metro').sortable({
				update: function (event, ui) {
					var $ctx = $( this ),
						name = self.getAttributeId( $ctx, true ),
						$select = $("#"+ name +"_sel");

					self.updateSelects( $ctx, self, name, $select );
				}
			});
		},
		init: function () {
			this.createSortable();

			this.listenRoomSelected();
			//
			$.each( ["number_room", "district", "metro"], function (idx, name) {//listen
				var $select = $("#"+ name +"_sel");

				$select.on( 'change', function () {
					create_select( name );
				});
				//Прячем список выбранных метро, районов и квартир
				$( "#filter-select-"+ name ).hide();
			});
		},
		//  выбирает checkbox по счетчикам и меняет цвет вкладкам
		listenRoomSelected: function () {
			filters.rooms_selected.change( function () {
				var $rooms = filters.rooms_view,
					$selected_inputs = $("input", filters.rooms_selected ),
					$checked = $selected_inputs.filter(":checked"),
					len = $checked.length;

				//  изначально устанавливаем всем вкладкам черный цвет текста при любом событии
				$("label", $rooms ).removeClass("ui-state-active");

				//  если checkbox в number_room не выбраны
				if ( len === 0 || len === $selected_inputs.length ) {
					$("label:first", $rooms ).addClass("ui-state-active");
					$("input:first", $rooms ).prop("checked", "checked");
				} else {
					//  пробегаем все выделенные
					$checked.each(function () {
						var $ctx = $(this),
							id = $("input[ value=" + $ctx.attr("value") + "]", $rooms ).attr("id"),
							label = $("label[for=" + id + "]", $rooms )
								.addClass("ui-state-active");

						if ($ctx.val() > $("label:last", $rooms ).val()) {
							$("label:last", $rooms )
								.addClass("ui-state-active");
						}
					});
				}
			});
		}
	};

}());