<?php

/**
Cash - это плагин для расчётно-кассового обслуживания (касса). Зависит от realtyList
*/

$controllers->ref([
	"cash" => [
		menu => ["Касса", "Касса"],
		model => "cash",
		access => "self",
		user => ["realty", "user"],
		domain => [
			[
				name => "id",
				title => "№",
			],
			[
				name => "sum",
				title => "Сумма",
				group => "sum",
			],
			[
				name => "time",
				title => "Время проведения",
			],
			[
				name => "payment",
				title => "Вид платежа",
				ref => "payment",
				dict => "payment"			# id справочника, который будет вызван
			],
			[
				name => "realty_id",
				title => "№",
				width => 20
			],
			[
				name => "realty",
				title => "Недвижимость",
				ref => "realty"
			],
			[
				name => "user",
				title => "Плательщик",
				ref => "user"
			],
			[
				name => "cashier",
				title => "Кассир",
				ref => "user"
			],
		]
	],

	"payment" => [
		menu => ["Касса", "Вид платежа"],
		model => "payment",
		access => "authall",
		domain => [
			[
				name => "id",
				title => "№",
			],
			[
				name => "name",
				title => "Название",
			],
			[
				name => "sign",
				title => "Знак",
				width => 20
			],
			[
				name => "desc",
				title => "Описание",
			],

		]
	],
]);

