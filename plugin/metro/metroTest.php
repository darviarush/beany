<?php
require_once 'lib/UnitCase.php';

class MetroTest extends UnitCase {

	public function testModel() {
		R::freeze( false );
		
		//создаем таблицу метро
		$metro = R::dispense("metro");
		$metro->place = R::dispense("place");
		$metro->name = R::dispense("name");
		$metro->x = 1;	# координаты на схеме
		$metro->y = 1;
		R::store($metro);
		
		R::freeze( true );
	}

    public function testMetro() {
		$app = self::$app;
		$app->plugins->loadOne("metro");
		
		$language = R::dispense("language");
		$language->name = 'Test';
		$language->code = 'tt';
		R::store($language);
		
		$place = R::dispense("place");
		
		$name = R::dispense("name");
		
		$metro = R::dispense("metro");
		$metro->place = $place;
		$metro->name = $name;
		$metro->x = 1;	# координаты на схеме
		$metro->y = 1;
		R::store($metro);
		
		$realty = R::dispense("realty");
		$realty->place = $place;
		$realty->metro = $metro;
		$realty->user = R::dispense("user");
		R::store($realty);
		
		$namen = R::dispense("namen");
		$namen->name = $name;
		$namen->iname = 'метро 1';
		$namen->language_id = $language->id;
		R::store($namen);
		
		$place1 = R::dispense("place");
		
		$name1 = R::dispense("name");
		
		$metro1 = R::dispense("metro");
		$metro1->place = $place1;
		$metro1->name = $name1;
		$metro1->x = 1;	# координаты на схеме
		$metro1->y = 1;
		R::store($metro1);
		
		$realty1 = R::dispense("realty");
		$realty1->place = $place1;
		$realty1->metro = $metro1;
		$realty1->user = R::dispense("user");
		R::store($realty1);
		
		$namen1 = R::dispense("namen");
		$namen1->name = $name1;
		$namen1->iname = 'метро 2';
		$namen1->language_id = $language->id;
		R::store($namen1);
		
		
		
		
		
		$ret = $app->controllers->controllerRun($argv = (object) [
			url=>"/api/metro/load", param=>[city_id=>$place->id], cookie => [lang=>'tt']
		]);
		
		$this->assertEquals($ret[0][name], "метро 1");
		
		$ret = $app->controllers->controllerRun($argv = (object) [
			url=>"/api/metro/load", param=>[city_id=>$place1->id], cookie => [lang=>'tt']
		]);
		
		$this->assertEquals($ret[0][name], "метро 2");
    }
}
