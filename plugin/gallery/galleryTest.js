module("Gallery")

test("gallery", function() {
	ok($("#plugin-gallery").length, 1)
	var gallery = new app.classes.Gallery()
	ok(gallery instanceof Object)
	/*gallery.addImg([14])
	ok($("#plugin-gallery .app-foto-gallery a").length,1, "Добавлена одна картинка")
	gallery.addImg([3,2,4])
	ok($("#plugin-gallery .app-foto-gallery a").length,4, "Было добавлено три картинки")*/
})