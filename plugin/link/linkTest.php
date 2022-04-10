<?php
require_once 'lib/UnitCase.php';
require_once 'link.php';

class LinkTest extends UnitCase {

	public function testModel() {
		#$link = R::dispense("link");
		#$link->name = "Тестовый Link";
		#R::store($link);
	}

    public function testTrue() {
        $this->assertTrue(true);
    }
}
