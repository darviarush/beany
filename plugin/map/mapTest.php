<?php
require_once 'lib/UnitCase.php';

class MapTest extends UnitCase {

	public function testModel() {
		R::freeze( false );
		/*
		$map = R::dispense("map");
		$map->name = "Тестовый Map";
		R::store($map);
		*/
		R::freeze( true );
	}

    public function testMap() {
		$app = self::$app;
        $app->plugins->loadOne("map");
		$this->assertTrue(true);
    }
}
