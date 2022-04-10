<?php
require_once 'lib/UnitCase.php';

class ProtocolTest extends UnitCase {

	public function testModel() {
		/*$protocol = R::dispense("protocol");
		$protocol->name = "Тестовый Protocol";
		R::store($protocol);*/
	}

    public function testTrue() {
        $app = self::$app;
        $app->plugins->loadOne("protocol");
		$this->assertTrue(true);
    }
}
