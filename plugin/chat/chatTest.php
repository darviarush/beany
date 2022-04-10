<?php
require_once 'lib/UnitCase.php';

class ChatTest extends UnitCase {

	public function testModel() {
		R::freeze( false );
		/*
		$chat = R::dispense("chat");
		$chat->name = "Тестовый Chat";
		R::store($chat);
		*/
		R::freeze( true );
	}

    public function testChat() {
		$app = self::$app;
        $app->plugins->loadOne("chat");
		$this->assertTrue(true);
    }
}

