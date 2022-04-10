<?php
require_once 'lib/UnitCase.php';

class CoreTest extends UnitCase {

	public function testMe() {
		$user = R::dispense("user"); R::store($user);
		$session = Model_Session::new_session($user);
		
		$type = R::findOne("type", "name='email'");
		if(!$type->id) {
			$type = R::dispense("type");
			$type->name = "email";
			R::store($type);
		}
		
		$type = R::findOne("type", "name='phone'");
		if(!$type->id) {
			$type = R::dispense("type");
			$type->name = "phone";
			R::store($type);
		}
		
		$type = R::findOne("type", "name='skype'");
		if(!$type->id) {
			$type = R::dispense("type");
			$type->name = "skype";
			R::store($type);
		}
		
		$app = self::$app;
		$app->plugins->loadOne("core");
		$controllers = $app->controllers;
		
		$argv = (object) [
			url=>"/api/core/me/store",
			param=>[name=>'123', ps=>'ps-ps'],
			cookie => [sess=>$session->hash]
		];
		$res = $controllers->controllerRun($argv);
		
		$user = R::load("user", $user->id);
		
		$this->assertEquals($user->name, '123');
		$this->assertFalse(isset($user->ps));
		
		$argv = (object) [		# добавили
			url=>"/api/core/me/contact/store",
			param=>[id=>0, contact=>'e@e.ee', type=>'email'],
			cookie => [sess=>$session->hash]
		];
		$res = $controllers->controllerRun($argv);
	
		$contact1 = R::getAll("select a.id, t.name \"type\", a.contact contact  from account a, type t where a.user_id=? and t.id=a.type_id", [$user->id]);
		$this->assertEquals($contact1[0]['type'], 'email');
		$this->assertEquals($contact1[0]['contact'], 'e@e.ee');
		
		$argv = (object) [		# заменили
			url=>"/api/core/me/contact/store",
			param=>[id=>$contact1[0]['id'], contact=>'b@b.bb', type=>'email'],
			cookie => [sess=>$session->hash]
		];
		$res = $controllers->controllerRun($argv);
		
		$contact = R::getAll("select t.name \"type\", a.contact contact  from account a, type t where a.user_id=? and t.id=a.type_id", [$user->id]);
		$this->assertTrue(in_array(['type'=>'email','contact'=>'b@b.bb'],$contact));
		$this->assertEquals(count($contact), 1);

		
		$argv = (object) [		# удалили
			url=>"/api/core/me/contact/store",
			param=>[id=>$contact1[0]['id'], contact=>'', type=>'email'],
			cookie => [sess=>$session->hash]
		];
		$res = $controllers->controllerRun($argv);
		
		
		$contact = R::getAll("select t.name \"type\", a.contact contact from account a, type t where a.user_id=? and t.id=a.type_id", [$user->id]);
		$this->assertEquals(count($contact), 0);
			
		$argv = (object) [
			url=>"/api/core/me/contact/store",
			param=>[id=>0, contact=>'+7 (123) 333-44-55', type=>'phone'],
			cookie => [sess=>$session->hash]
		];
		$res = $controllers->controllerRun($argv);
		$contact = R::getAll("select  t.name \"type\", a.contact contact from account a, type t where a.user_id=? and t.id=a.type_id", [$user->id]);
		
		$this->assertTrue(in_array(['type'=>'phone','contact'=>'+71233334455'], $contact));
		
		$argv = (object) [
			url=>"/api/core/me/contact/store",
			param=>[id=>0, contact=>'skype2', type=>'skype'],
			cookie => [sess=>$session->hash]
		];
		
		$res = $controllers->controllerRun($argv);
		$account = R::findOne("account", 'id=?', [$res["id"]]);
		$this->assertEquals($account->contact, "skype2");
		
		$id = $res["id"];
		
		$argv = (object) [
			url=>"/api/core/me/contact/store",
			param=>[id=>$id, contact=>'', type=>'skype'],
			cookie => [sess=>$session->hash]
		];
		
		$res = $controllers->controllerRun($argv);
		$account = R::findOne("account", 'id=?', [$id]);
		$this->assertEquals($account->id, null);
		
		$argv = (object) [
			url=>"/api/core/new_user",
			param=>[contact=>'test@test.tt']
		];
		$res = $controllers->controllerRun($argv);
		$account = R::getAll("select u.id id from account a, \"user\" u, type t where a.user_id=u.id and a.contact = ? and t.id=a.type_id", ['test@test.tt']);
		$this->assertEquals(count($account), 1);
		
		$argv = (object) [
			url=>"/api/core/new_user",
			param=>[contact => 'test@test.tt']
		];
		$res = $controllers->run($argv);
		$account = R::getAll("select u.id id from account a, \"user\" u, type t where a.user_id=u.id and a.contact = ? and t.id=a.type_id", ['test@test.tt']);
		$this->assertEquals(count($account), 1);
		
		$argv = (object) [
			url=>"/api/core/new_user",
			param=>[contact=>'+7 (123) 333-44-55']
		];
		$res = $controllers->run($argv);
		$account = R::getAll("select u.id id, a.contact contact, t.name \"type\" from account a, \"user\" u, type t  where a.user_id=u.id and a.contact = ? and t.id=a.type_id", ['+71233334455']);
		$this->assertEquals(count($account), 1);
		
		$argv = (object) [
			url=>"/api/core/new_user",
			param=>[contact => '+7 (123) 333-44-55']
		];
		$res = $controllers->run($argv);
		$account = R::getAll("select u.id id from account a, \"user\" u, type t where a.user_id=u.id and a.contact = ? and t.id=a.type_id", ['+71233334455']);
		$this->assertEquals(count($account), 1);
		
		$argv = (object) [
			url=>"/api/core/me/load",
			cookie => [sess=>$session->hash]
		];
		$res = $controllers->controllerRun($argv);
		$this->assertEquals($res["info"]['name'], '123');
		
		$user2 = R::dispense("user"); R::store($user2);
		$session2 = Model_Session::new_session($user2);
	}
	
	public function testDeleteSession() {
	
		$user = R::dispense("user");
		$user->code = "qwerty";
		R::store($user);
		
		$type = R::findOne('type','name=?',["x"]);
		
		if (!$type->id){		
			$type = R::dispense("type");
			$type->name = "x";
			R::store($type);
		} else {
			$type = R::load("type", $type->id);
		}
		
		$account = R::dispense("account");
		$account->contact = "u@u.uu";
		$account->type = $type;
		$account->user = $user;
		R::store($account);
		
		$session = Model_Session::login($type->name, $account->contact, $user->code);

		$this->assertTrue((bool) $session->time);

		$session->time -= 60*60;
		R::store($session);
		
		$app = self::$app;
		$app->plugins->loadOne("core");
		
		$app->cron_run(3600);	# переносим в будущее на час
		$session = R::load("session", $session->id);
		$this->assertFalse((bool) $session->id);
	}

	function testSession() {
		$user = R::dispense("user");
		$user->password = "qwerty";
		R::store($user);
		$type = R::findOne('type','name=?',["email"]);
		if (!$type->id){
			$type = R::dispense("type");
			$type->name = "email";
			R::store($type);
		} else {
			$type = R::load("type", $type->id);
		}
		
		$account = R::dispense("account");
		$account->contact = "y@y.yy";
		$account->type = $type;
		$account->user = $user;
		R::store($account);
		
		$session = Model_Session::login($type->name, $account->contact, $user->password);

		$this->assertTrue((bool) $session->id);
		
		$type = R::findOne('type','name=?',["phone"]);
		if (!$type->id){		
			$type = R::dispense("type");
			$type->name = "phone";
			R::store($type);
		} else {
			$type = R::load("type", $type->id);
		}
		
		$account = R::dispense("account");
		$account->contact = "+71112223344";
		$account->type = $type;
		$account->user = $user;
		R::store($account);

		$session = Model_Session::login($type->name, $account->contact, $user->password);

		$this->assertTrue((bool) $session->id);
	}

}

