app.exports.realty.main_list_options = {
	url: "/api/realtyList/list/load",

	param: {
		my: 0,
		equipment: 0,
		currency: 1,//currency,
		order:"id desc",
		district:"[]", number_room:"[]", metro:"[]",
		city_id: 0,
		region_id: 0,
		country_id: 0,
		limit: 12
	},
	//  new element proto
	elem: $('#realty-elem-2'),
	//  добавляем данные
	paste: function (row) {
		row.href_id = "#realty="+ row.id;
		if (row.metro == null) row.metro = "Не указано";
		row.img_path = app.helper.img_preview( row.img_id );
	},
	pasted: function (div, row, idx) {
		var elem = div.find(".app-equipment");
		div.addClass( idx % 2 ? "app-list-even" : "app-list-odd");
		var rent = app.exports.realty
		if ( rent.shorts ) rent.shorts.equipmentWidget( elem, row.equipment );
		
		var id = row.id
		div.find("[name=href_id]").mouseover(function() {
			this.href = location.hash + "/realty="+id
		})
	}
};


/* старый для стартовой страницы
app.exports.realty.main_list_options = {
	url: "/api/realtyList/list/load",
	param: {
		my: 0,
		equipment: 0,
		limit:9,
		currency: 1,//currency,
		order:"id desc",
		district:"[]", number_room:"[]", metro:"[]",
		city_id: 0,
		region_id: 0,
		country_id: 0
	},
	elem: $('#realty-elem'),
	//  добавляем данные
	paste: function (row) {
		row.href_id = "#realty="+ row.id;
		if (!row.city) delete row.city;	// why not nullify?
		row.img_path = app.helper.img_preview2( row.img_id );
	},
	pasted: function (div, row, idx) {
		app.exports.realty.bindHover( div );
	}
};*/