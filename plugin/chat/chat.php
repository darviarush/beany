<?php

/**
Chat - это плагин для чата консультанта с пользователем
*/

$controllers->add([
	"chat/load" => [
		desc => "Возвращает limit сообщений, после сообщения с указанным last_id",
		access => "all", 
		param => [last_id=>"nuint", limit=>"limit_by"],
		func => function($param, $argv) {
			$chat = $argv->cookie["chat"];
			return [];
		}
	],
	"chat/store" => [
		desc => "Сохраняет сообщение пользователя, если в куке нет параметра chat - генерирует его",
		access => "all", 
		param => [msg=>"string"],
		func => function($param, $argv) {
			$chat = $argv->cookie["chat"];
			if(!$chat) {	# генерируем идентификатор и помещаем его в базу
				$chat = md5(time().random());
				# проверить, чтобы в базе небыло такого $chat
			}
			return [chat=>$chat];
		}
	],
	"chat/admin/load" => [
		desc => "Загружаем все имеющиеся сообщения для консультанта (id)",
		access => "auth", 
		param => [id=>id, chat=>"string", msg=>"string"],
		func => function($param, $argv) {
			return [];
		}
	],
	"chat/admin/store" => [
		desc => "Сохраняем сообщение консультанта (id), для пользователя (chat)",
		access => "auth", 
		param => [id=>id, chat=>"string", msg=>"string"],
		func => function($param, $argv) {
			return [];
		}
	]
]);
