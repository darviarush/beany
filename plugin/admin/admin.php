<?php

/**
Admin - это плагин для админки
*/

$controllers->ref([
	"admin" => [
		menu => ["Админка", "Страны"],
		model => "country",
		access => "auth",
		domain => [
			[
				name => "id",
				title => "№",
			],
			[
				name => "name",
				col => "coalesce(
					(select name from placen where country.id=placen.place_id and language_id=1 limit 1),
					(select name from placen where country.id=placen.place_id and language_id=4 limit 1),
					(select name from placen where country.id=placen.place_id limit 1)
				)",
				title => "Страна",
			],
			[
				name => "alpha2",
				title => "Код страны",
			],
			[
				name => "code",
				title => "Код телефона",
			],
			[
				name => "mask",
				title => "Маска",
			],
			
		]
	],
]);
