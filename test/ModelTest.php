<?php
require_once 'lib/UnitCase.php';
require_once 'lib/Model.php';


class ModelTest extends UnitCase {
	
	function testModel() {
		R::freeze( false );
		$app = self::$app;
		# языки
		$language = R::dispense("language");		// смещение флага определяется по id
		$language->name = "тестовое имя";
		$language->code = "TS";
		$language->setMeta("buildcommand.unique", [["code"]] );
		R::store($language);
		
		# названия чего-то из разных таблиц на разных языках. Поля name_id таблиц будут ссылаться на эту. И на эту же таблицу будет ссылаться имена из namen
		$name = R::dispense("name");
		R::store($name);

		# названия чего-либо на разных языках
		$namen = R::dispense("namen");
		$namen->name = $name;
		$namen->language = $language;
		$namen->iname = "Тестовый namen";
		R::store($namen);
		$app->pdo->create_index('namen', 'lower(iname) varchar_pattern_ops');
		
		# погода в городе на rp5.ru. rp5.id совпадает c id на rp5.ru. 
		$rp5 = R::dispense("rp5");			# языки на которых можно запрашивать погоду в городе
		$rp5->sharedLanguage = [$language];
		R::store($rp5);
		
		# место - страна/регион/район/город
		$place = R::dispense("place");
		$place->country_id = 1;
		$place->region_id = 1;
		$place->vicinity_id = 1;
		$place->city_id = 1;
		$place->rp5 = $rp5;		# id города с погодой на rp5.ru
		$place->latitude = 1.8;
		$place->longitude = 1.8;
		$place->is = false;		# для оператора, который просматривает новые места (добавленные из карты гугла при изменении адреса квартиры)
		$place->locid = 1;		# указатель для 
		$place->counter_realty = 1;
		$place->ownRealty[] = R::dispense("realty");
		$place->setMeta("buildcommand.indexes", [country_id=>place_country_idx, region_id=>place_region_idx, vicinity_id=>place_vicinity_idx, city_id=>place_city_idx, locid=>place_locid_idx]);
		R::store($place);

		//counter_realty в таблице place
		$app->pdo->create_index('place', 'counter_realty desc');
		R::exec("update place set counter_realty=0 where counter_realty is null");
		$app->pdo->alter_table('place', 'alter column counter_realty set default 0');
		$app->pdo->alter_table('place', 'alter column counter_realty set not null');
	
		R::exec("create table if not exists block (startIpNum bigint not null, endIpNum bigint not null, locId int not null)");
		$app->pdo->create_index("block", "startIpNum, endIpNum");

		$placen = R::dispense("placen");
		$placen->name = "Тестовый placen";
		$placen->language = $language;
		$placen->place = $place;
		$placen->counter_realty = 1;
		$placen->setMeta("buildcommand.unique", [["place_id", "language_id", "name"]]);	# для проверки - чтобы не было одинаковых названий одного места
		R::store($placen);
		//правила для таблицы placen
		$app->pdo->create_index('placen', 'counter_realty desc');
		R::exec("update placen set counter_realty=0 where counter_realty is null");
		$app->pdo->alter_table('placen', 'alter column counter_realty set default 0');
		$app->pdo->alter_table('placen', 'alter column counter_realty set not null');
		$app->pdo->create_index('placen', 'lower("name") varchar_pattern_ops asc, counter_realty desc');
		
		/*$realty = R::dispense("realty");
		$realty->place = $place;
		R::store($realty);

		// правила для таблицы placen
		$where = "in (SELECT unnest(ARRAY[place.country_id, place.region_id, place.vicinity_id, place.city_id]) row_id FROM place WHERE place.id =";
		$add_counter_place = "UPDATE place SET counter_realty = counter_realty+1 WHERE id $where";
		$del_counter_place = "UPDATE place SET counter_realty = counter_realty-1 WHERE id $where";
		
		$add_counter = "UPDATE placen SET counter_realty=counter_realty+1 WHERE place_id $where";
		$del_counter = "UPDATE placen SET counter_realty=counter_realty-1 WHERE place_id $where";
		$where = "old.place_id<>new.place_id";
		$rules = [["event"=>"INSERT", "body"=>["$add_counter new.place_id)", "$add_counter_place new.place_id)"], "where"=>""],
			["event"=>"UPDATE", "body"=>["$add_counter new.place_id)", "$del_counter old.place_id)", 
										 "$add_counter_place new.place_id)", "$del_counter_place old.place_id)"], "where"=>$where],
			["event"=>"DELETE", "body"=>["$del_counter old.place_id)", "$del_counter_place old.place_id)"], "where"=>""]];

		foreach ($rules as $rule)
			$app->pdo->create_rule("realty", $rule["event"], $rule["body"], $rule["where"]);
		*/
		
		# страна - расширяет place, тоесть country.id=place.id
		$country = R::dispense("country");
		$country->code = "x";				# телефонный код страны
		$country->mask = "x";				# маска телефона
		$country->alpha2 = "xx";			# код страны alpha2
		$country->pos = 1;					# номер флага страны в www/images/country-flags.png
		R::store($country);
		
		# файлы в theme/images/places. Её id соответствуют id из таблицы place
		$logo = R::dispense("logo");
		$logo->place = $place;
		$logo->crc = 1;			# crc-сумма имени файла
		$logo->name = "x";		# название файла в theme/images/places
		R::store($logo);
		
		$app->pdo->create_index("logo", "name");
		
		# константы
		$constants = R::dispense("constants");
		$constants->val = 1;
		$constants->desc = "Тестовая константа";
		R::store($constants);
		
		# список контроллеров
		$control = R::dispense("control");
		$control->name = "Тестовый контроллер";
		$control->desc = "Описание";
		$control->param = "Параметры";
		$control->access = "Доступ";
		$control->crc = 1;
		$control->setMeta("buildcommand.unique", [["name"]] ); # уникальный индекс
		R::store($control);				
		# роли
		$role = R::dispense("role");
		$role->name = "Тестовая роль";
		$role->sharedControl[] = $control;
		R::store($role);
	
		# пользователь
		$user = R::dispense("user");
		$user->name = "Тестовый пользователь";
		$user->password = "123456";
		$user->code = 'qwerty';
		$user->time = time();
		$user->sharedRole[] = $role;
		$user->setMeta("cast.password", "text");
		R::store($user);
		
		$type = R::dispense("type");
		$type->name = "x";
		$type->setMeta("buildcommand.unique", [["name"]] ); # уникальный индекс
		R::store($type);
		
		$account = R::dispense("account");
		$account->type = $type;
		$account->contact = 'test@test.test';
		$account->user = $user;
		$account->setMeta("buildcommand.unique", [["contact", "type_id"]] ); # уникальный индекс
		R::store($account);
		
		$user1 = R::load("user", $user->id);
		$this->assertEquals(1, count($user1->sharedRole));
		
		# сессия
		$session = R::dispense("session");
		$this->assertFalse($session->auth("Тестовый контроллер"));
		
		$session = Model_Session::new_session($user->id);
		$this->assertEquals($session->user->id, $user->id);
		$this->assertInternalType("string", $session->hash);
		
		$session->logout();
		$this->assertEquals($session->id, 0);
		$this->assertNull($session->user->id);
		
		$session = Model_Session::login($type->name, $account->contact, $user->password);
		
		$this->assertEquals($session->user->id, $user->id);
		$this->assertInternalType("string", $session->hash);
		
		$this->assertTrue($session->auth("Тестовый контроллер"));
		
		$session1 = Model_Session::get($session->hash);
		$this->assertEquals($session->id, $session1->id);
		
		$session->logout();
		$this->assertNull($session->user->id);
		
		# рисунки
		$img = R::dispense("img");
		$body = file_get_contents("www/theme/images/empty2.png");
		$img->save($body);
		$this->assertTrue(file_exists($img->path()));
		R::trash($img);
		$this->assertFalse(file_exists($img->path()));
		
		/*# протокол доступа к контроллерам
		$protocol = R::dispense("protocol");
		$protocol->control = $control;
		$protocol->user = $user;	# кто вызвал контроллер
		$protocol->modtime = "2012-01-01 12:55:12";
		$protocol->param = "{x: 12}"; # параметры вызова в формате json
		//$user->setMeta("cast.modtime", "timestamp");
		$protocol->status = "error"; # поле статуса завершения вызова контроллера - если вызов завершился с ошибкой, то сюда пишется ошибка
		R::store($protocol);*/
		
		R::freeze( true );
	}

}


