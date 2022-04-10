module("Notice")

test("notice", function() {
	equal($("#plugin-notice").length, 1, "Плагин подключен")
	
	ok(app.classes.Notice)
	
	var notice = new app.classes.Notice()
	ok(notice instanceof Object)
	
	notice.multi_data($("#realty-notice"),[["id","phone", "email","comment"],["1","+7 (345) 346-56-45","o@o.oo", "комментарий"]])
	equal($("#realty-notice tr").length, 1, "Добавление одной строки")
	equal($("#realty-notice [name=id]").val(), "1")
	
	notice.multi_clean($("#realty-notice"))
	equal($("#realty-notice tr").length, 1, "Очистка мульти")
	
	notice.multi_data($("#realty-notice"),[["id","phone", "email","comment"],["1","+7 (345) 346-56-45","o@o.oo", "комментарий"],["2","+7 (345) 346-56-45","o@o.oo", "комментарий"]])
	equal($("#realty-notice tr").length, 2, "Добавление нескольких строк")
	
	notice.multi_clean($("#realty-notice"))
	equal($("#realty-notice tr").length,1)
	
	$("#realty-service-balance").text("1")
	notice.multi_data($("#realty-balance"),[["service","cena_count", "total"],["1","2","3"],["2","3","4"]])
	//notice.multi_data($("#realty-balance"),[["notice-service","cena_count", "total"],["1","2","3"],["2","3","4"]])
})

