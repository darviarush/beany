module("RealtyList")

test("Модуль", function() {
	ok(app.plugin.realtyList)
	ok($("#plugin-realtyList").length)
	ok(app.classes.RealtyArmoring)
	
	wait // ожидаем загрузку списка
	
	ok($("#realty-list-0 :first-child").length)
	
	$("#realty-list-0 :first-child").click()
	
	wait

	ok($("#realty-card input[name=address]").val())
	
	var x = $('[aria-labelledby="ui-dialog-title-realty"] .ui-dialog-titlebar-close')
	ok(x.length)
	x.click()
	
})