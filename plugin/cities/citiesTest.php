<?php
require_once 'lib/UnitCase.php';

class CitiesTest extends UnitCase {

	public function testModel() {
		R::freeze( false );
		/*
		$cities = R::dispense("cities");
		$cities->name = "Тестовый Cities";
		R::store($cities);
		*/
		R::freeze( true );
	}

    public function testCities() {
		$app = self::$app;
        $app->plugins->loadOne("cities");
		$controllers = $app->controllers;
		
		$language = R::dispense("language");
		$language->code = "test1";
		R::store($language);
		
		
		//добавляем страну
		$country = R::dispense("place");
		R::store($country);
		$country_p = R::load("place", $country->id);
		$country_p->country = $country;
		R::store($country_p);
		
		$countryn = R::dispense("placen");
		$countryn->name = 'Страна 1';
		$countryn->place = $country_p;
		$countryn->language = $language;
		R::store($countryn);
		
		//регион
		$region = R::dispense("place");
		$region->country = $country_p;
		R::store($region);
		$region_p =  R::load("place", $region->id);
		$region_p->region = $region;
		R::store($region_p);
		
		$regionn = R::dispense("placen");
		$regionn->name = 'Регион 1';
		$regionn->place = $region;
		$regionn->language = $language;
		R::store($regionn);
		
		//р-он
		$vicinity = R::dispense("place");
		$vicinity->country = $country_p;
		$vicinity->region = $region_p;
		R::store($vicinity);
		$vicinity_p = R::load("place", $vicinity->id);
		$vicinity_p->vicinity = $vicinity;
		R::store($vicinity_p);
		
		$vicinityn = R::dispense("placen");
		$vicinityn->name = 'Район 1';
		$vicinityn->place = $vicinity;
		$vicinityn->language = $language;
		R::store($vicinityn);
		
		//город 1
		$city1 = R::dispense("place");
		$city1->country = $country_p;
		$city1->region = $region_p;
		$city1->vicinity = $vicinity_p;
		R::store($city1);
		
		$city1_p = R::load("place", $city1->id);
		$city1_p->city = $city1;
		R::store($city1_p);
		
		$cityn1 = R::dispense("placen");
		$cityn1->name = 'Москва 1';
		$cityn1->place = $city1_p;
		$cityn1->language = $language;
		R::store($cityn1);
		
		$user1 = R::dispense("user"); R::store($user1);
		# логинимся
		$session1 = Model_Session::new_session($user1);
		
		# создаём объект недвижимости
		$realty = R::dispense("realty");
		$realty->user = $user1;
		$realty->place = $city1;
		R::store($realty);
		$place_city = R::find("place", "city_id=?", [$city1->id]);
		
		$cookie = [lang=>$language->code];
		
		# получаем страны и города
		$argv = (object) [url=>"/api/cities/load", param=>[country_id=>0, region_id=>0, vicinity=>0], cookie=>$cookie];
		$res = $controllers->controllerRun($argv);
		$this->assertEquals($res[0][0], "id");
		$this->assertEquals($res[0][1], "name");
		$this->assertEquals($res[0][2], "city_id");
		$this->assertEquals($res[0][4], "counter_realty");
		$this->assertTrue(in_array([$country->id, 'Страна 1', $city1->id, 'Москва 1', 1],$res));
		
		//город 2
		$city2 = R::dispense("place");
		$city2->country = $country_p;
		$city2->region = $region_p;
		$city2->vicinity = $vicinity_p;
		R::store($city2);
		
		$city2_p =R::load("place", $city2->id);
		$city2_p->city = $city2;
		R::store($city2_p);
		
		$argv = (object) [url=>"/api/cities/load", param=>[country_id=>$country_p->id, region_id=>0, vicinity=>0], cookie=>$cookie];
		$res = $controllers->controllerRun($argv);
		$this->assertEquals($res[0][0], "id");
		$this->assertEquals($res[0][1], "name");
		$this->assertEquals($res[0][2], "city_id");
		$this->assertEquals($res[0][4], "counter_realty");
		$this->assertTrue(in_array([$region->id, 'Регион 1', $city1->id, 'Москва 1', 1],$res));
		
		//город добавленный в регион но не добавленный в район
		$city2 = R::dispense("place");
		$city2->country = $country_p;
		$city2->region = $region_p;
		R::store($city2);
		
		$city2_p = R::load("place", $city2->id);
		$city2_p->city = $city2;
		R::store($city2_p);
		
		$cityn2 = R::dispense("placen");
		$cityn2->name = 'Москва 2';
		$cityn2->place = $city2_p;
		$cityn2->language = $language;
		R::store($cityn2);

		$argv = (object) [url=>"/api/cities/load", param=>[country_id=>$country_p->id, region_id=>$region->id, vicinity=>0], cookie=>$cookie];
		$res = $controllers->controllerRun($argv);
		$this->assertEquals($res[0][0], "id");
		$this->assertEquals($res[0][1], "name");
		$this->assertEquals($res[0][2], "city_id");
		$this->assertEquals($res[0][4], "counter_realty");
		$this->assertTrue(in_array([$vicinity->id, 'Район 1', $city1->id, 'Москва 1', 1],$res));
		$this->assertTrue(in_array([$region->id, 'Регион 1', $city2->id, 'Москва 2', 0],$res));
		
		$argv = (object) [url=>"/api/cities/load", param=>[country_id=>$country_p->id, region_id=>$region->id, vicinity=>$vicinity->id], cookie=>$cookie];
		$res = $controllers->controllerRun($argv);
		$this->assertEquals($res[0][0], "id");
		$this->assertEquals($res[0][1], "name");
		$this->assertEquals($res[0][2], "counter_realty");
		$this->assertEquals($res[1][1], 'Москва 1');
		$this->assertEquals($res[1][2], 1);
    }
}
