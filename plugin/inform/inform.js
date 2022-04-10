/**
inform - плагин для заявок на бронь
**/

(function () {
	$("#plugin-inform").pluginInit()

	var tabs = app.exports.realty.tabs,
		index,
		$content_node,
		inform_list_options = {
		url:"/api/inform/list/load",
		param: {
			limit:9,
			currency: $("#currency-change :selected").val()
		},
		elem: $('#realty-elem-5'),
		//  добавляем данные
		paste: function (row) {
			row.img_path = app.helper.img_preview2( row.img_id );
			row.href_id = "#realty="+ row.id;
			
			if (row.opt == 0) { 
				row.status = "Бронь";
			} else if (row.opt == 4) { 
				row.status = (app.auth.user(row.user_id))? "Новая заявка" : "Ваша заявка";
			} else if (row.opt == 5) {
				row.status = (app.auth.user(row.user_id))? "Подтвержденая" : "Ждет оплаты";
			} else if (row.opt == 6) {
				row.status = "Отменена арендодателем";
			} else if (row.opt == 7) {
				row.status = "Просрочена арендатором";
			}
			
			if (!row.city) {
				delete row.city;
			}
		},
		pasted: function (div, row, idx) {
			var elem = div.find( ".app-equipment" );

				div.addClass( idx % 2 ? "app-list-even" : "app-list-odd" );

				app.exports.realty.shorts.equipmentWidget( elem, row.equipment );
				
			if ($("[name=opt]", div).val() != 5) { 
				$(".appexternalPayment", div).remove()
			} else {
				$(".appexternalPayment", div).show()
			}
		}
	};
	
	$(".appexternalPayment").on( 'click', function (e) {
		e.stopPropagation();
		
		var arm_id = $("[name=armoring_id]",$(this).parent()).val();
		app.overlay.addOwl( '/externalPayment', arm_id);
		return false;
	});
	
	index = tabs.use_tab_list( $("#all-application > *"), "inform" );
	$content_node = $( "#realty-list-"+ index );
	
	$content_node.listCreate( inform_list_options );

	tabs.current_callbacks[ index -1 ] = function () {
		$content_node.list( 'update', {} );
	};
	
	
	tabs.$holder.find("ul:first > li:eq("+ index +")").show();
	
	app.event.add("application-refresh", "appl-reafresh", function(){
		console.log("application-refresh")
		$content_node.list("refresh");
	})
})();