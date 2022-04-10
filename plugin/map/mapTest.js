module("Map")

test("map", function() {
	ok($("#plugin-map").length, 1)
	var map = new app.classes.GoogleMap()
	ok(map instanceof Object)
	map.address_time()
})
