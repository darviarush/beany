module("Armoring")

test("armoring", function() {
	equal($("#plugin-armoring").length, 1, "Плагин подключен")
	var armperiod = new app.classes.RealtyArmPeriod()
	ok(armperiod instanceof Array)
	
	var date = new Date()
	armperiod.select(date)				// 0..0
	armperiod.select(date.add(1))		// 0..1
	equal(armperiod.length, 1)
	
	armperiod.select(date.add(3))		// 0..1 3..3
	armperiod.select(date.add(-4))		// -4..-4 0..1 3..3
	equal(armperiod.length, 3)
	
	armperiod.select(date.add(2))		// -4..-4 0..3
	equal(armperiod.length, 2)
	
	armperiod.select(date.add(-3))		// -4..-3 0..3
	armperiod.select(date.add(-2))		// -4..-2 0..3
	armperiod.select(date.add(-1))		// -4..3
	equal(armperiod.length, 1, "1 объект")
	
	armperiod.unselect(date)			// -4..-1 1..3
	equal(armperiod.length, 2, "2 объекта 1")
	
	armperiod.unselect(date.add(-1))	// -4..-2 1..3
	equal(armperiod.length, 2, "2 объекта 2")
	armperiod.unselect(date.add(1))		// -4..-2 2..3
	equal(armperiod.length, 2, "2 объекта 3")
	
	date = date.date_only()
	ok(armperiod[0].fromdate.eq(date.add(-4)), "-4")
	ok(armperiod[0].todate.eq(date.add(-2)), "-2")
	ok(armperiod[1].fromdate.eq(date.add(2)), "2")
	ok(armperiod[1].todate.eq(date.add(3)), "3")
	
	var realtyArmoring = new app.classes.RealtyArmoring({armoring: app.util.rowsToArray([
		["id", "bay", "realty_id", "user_id", ["ownArmperiod", "fromdate", "todate"]],
		[1, 0, 1, -1, [['2012-01-01', '2012-01-03'], ['2012-01-03', '2012-01-06']]]
	])})
	ok( realtyArmoring.armoring[0].ownArmperiod[0].fromdate.eq(DatDate('2012-01-01')), "date1")
	equal( String(realtyArmoring.armoring[0].ownArmperiod[0].fromdate), String(DatDate('2012-01-01')), "date1 - string" )
	ok( realtyArmoring.armoring[0].ownArmperiod[0].todate.eq(DatDate('2012-01-03')), "date2")
	ok( realtyArmoring.armoring[0].ownArmperiod[1].fromdate.eq(DatDate('2012-01-03')), "date1 - 2")
	ok( realtyArmoring.armoring[0].ownArmperiod[1].todate.eq(DatDate('2012-01-06')), "date2 - 2")
	
	ok( !realtyArmoring.arm(DatDate('2012-01-03')) , "не установлен 03")
	ok( !realtyArmoring.add(DatDate('2012-01-02')) , "не установлен 02")
	realtyArmoring.left_arm(DatDate('2012-01-08'))
	equal(realtyArmoring.sel.length, 1, " установлен 08")
	ok(realtyArmoring.right_arm(DatDate('2012-01-06')), " установлен 06-08")
	
	equal(realtyArmoring.sel.length, 1, "выбор = 06-08")
	equal(realtyArmoring.get_class1(realtyArmoring.armor), "app-dp-select", "класс выбора")
	equal(realtyArmoring.get_class1(realtyArmoring.armoring[0]), "app-dp-armored", "класс брони")
	
	equal( realtyArmoring.get_class(DatDate('2012-01-08')) , "app-dp-select2", "class выбор пользователя")
	equal( realtyArmoring.get_class(DatDate('2012-01-06')) , "app-dp-armored2 app-dp-select", "class двойная ячейка")
	
	ok(realtyArmoring.left_arm(DatDate('2012-01-08')), " снят 08, период 06-07")
})