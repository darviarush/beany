<?php

/**
Metro - это плагин для отображения схем метро
*/

$controllers->add([
	"metro/load" => [
		desc => "возвращает координаты станций с количеством квартир",
		access => "all", 
		param => [city_id=>"id"],
		func => function($param, $argv) {
			$lang_id = get_lang_id($argv);
			return R::getAll("select x, y, metro.id as id, count(*) as count, 
					coalesce(
						(select iname from namen where namen.name_id=metro.name_id and language_id=$lang_id limit 1),
						(select iname from namen where namen.name_id=metro.name_id order by language_id<>4 limit 1)
					) as name
				from metro
				inner join realty on realty.metro_id=metro.id
				where realty.place_id=?
				group by metro.id, x, y
				order by name
			", [$param->city_id]);
		}
	],
	"metro/store" => [
		desc => "сохраняет позицию станции на схеме",
		access => "auth", 
		param => ["id"=>"id", "x"=>"uint", "y"=>"uint"],
		func => function($param, $argv) {
			$metro = R::load("metro", $param->id);
			$metro->x = $param->x;
			$metro->y = $param->y;
			R::store($metro);
			return [];
		}
	],
	"metro/name/store" => [
		desc => "добавляет или редактирует имя станции. Если станция не указана, то добавляется",
		access => "auth",
		model => "metro",
		param => [id=>"nuint", name=>"string", language_id=>"id"],
		func => function($param, $argv) {
			$namen = R::dispense("namen");
			$namen->language_id = $param->language_id;
			$metro = $argv->model;
			$metro->name->ownNamen[] = $namen;
			R::store($metro);
			return $metro->id;
		}
	],
	"metro/name/erase" => [
		desc => "удаляет имя станции. Если имён у станции не остаётся, то она удаляется. Но если к ней привязаны квартиры, то последнее имя не удаляется, а выдаётся ошибка",
		access => "auth",
		model => "metro",
		param => [id=>"id", language_id=>"id"],
		func => function($param, $argv) {
			$count = R::getCell("select count(*) from realty where metro_id={$param->id}");
			if($count != 0) throw AException("К метро привязаны квартиры - его нельзя удалить");
			$metro = $argv->model;
			R::trashAll($metro->name->ownNamen);
			R::trash($metro->name);
			R::trash($metro);
		}
	],
]);
