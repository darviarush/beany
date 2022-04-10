/**
elect - это плагин для избранных квартир пользователя
**/
( function () {
	var tabs = app.exports.realty.tabs,
		index,
		$content_node,
		elect_list_options = {
			url: "/api/elect/list/load",
			param: {
				limit: 9,
				order: "id desc",
				currency: $( "#currency-change :selected" ).val()
			},
			elem: $( '#realty-elem-4' ),
			//  добавляем данные
			paste: function (row) {
				row.href_id = "#realty=" + row.id;

				if ( !row.city ) {
					delete row.city;// why not nullify?
				}
				row.img_path = app.helper.img_preview2( row.img_id );
			},
			pasted: function (div, row, idx) {
				var elem = div.find( ".app-equipment" );

				div.addClass( idx % 2 ? "app-list-even" : "app-list-odd" );

				app.exports.realty.shorts.equipmentWidget( elem, row.equipment );
			}
		};

	$("#plugin-elect").pluginInit();

		index = tabs.use_tab_list( $("#my-elect > *" ), "elect" );
		$content_node = $( "#realty-list-"+ index );
		
		//tabs.$holder.tabs( 'disable', index -1 );
		$content_node.listCreate( elect_list_options );

		tabs.current_callbacks[ index -1 ] = function () {
			$content_node.list( 'update', {} );
		};


	function change_elect(id, cmd){
		var cook = cookies().elect,
			elect = cook ? $.parseJSON( unescape( cook ) ) : [];

		if ( cmd=="add" ) {
			elect.push( id );
		} else {
			elect.splice( $.inArray( id, elect ), 1 );
		}

		app.util.set_cookie( "elect", $.toJSON( elect ), 365*20 );
	}



	$(".app-elect-erase").on( 'click', function (e) {
		e.stopPropagation();

		var id = $(this).parent().attr("list_id");

		if ( app.auth.check() ){
			$.post( "/api/elect/erase", {id: id}, function (data) {
				$content_node.list("refresh");
			});
		} else {
			change_elect( id, "erase" );

			$content_node.list( "refresh" );
		}
	});

	$(".app-elect").on( 'click', function (e) {
		e.stopPropagation();

		var id = $(this).parent().attr("list_id");

		if ( app.auth.check() ) {
			$.post( "/api/elect/save", {id: id}, function (data) {});
		} else {
			change_elect( id, "add" );

			$content_node.list( "refresh" );
		}

		tabs.$holder.find("ul:first > li:eq("+ index +")").show();
	});

		app.event.add( "login", "elect", function () {

			$.post( "/api/elect/save", {id:0}, function (data) {
				data = $.parseJSON( data );

				if ( cookies().elect || data ) {
					tabs.$holder.find( "ul:first > li:eq(" + index + ")" ).show();
				}

				app.util.set_cookie( "elect", null, 0 );
			} );
		} );
})()