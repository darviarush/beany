<?php

/**
Comment - это плагин для добавления комментариев к недвижимости
*/

$app->bind("realty-load", function($app, &$data) {
	$data["comment_count"] = R::getCell("select count(*) from \"comment\" where realty_id=".$data["id"]);
});

$controllers->add([
	"comment/load" => [
		desc => "возвращает комметарии для карточки недвижимости",
		access => "all",
		param => [offset => "offset", limit => "limit", order => "order_by", id=>"id"],
		func => function($param, $argv) {
			$ids = prepare_get_list("comment", ["realty_id={$param->id}"], $param);
			if(!$ids) return [];
			$arr = R::getAll("select \"comment\".id as id, msg, limitations, \"user\".name as name,  dt, rating
					from \"comment\" left join \"user\" on \"user\".id=user_id where \"comment\".".get_ids_list($ids).$param->order);
					
			$img = R::getAll("select c_i.img_id, c.id
					from \"comment_img\" c_i, \"comment\" c
					where c.id=c_i.comment_id and c.".get_ids_list($ids).$param->order);
					
			return arrayToRows(add_arr_in_arr($arr, $img));
		}
	],
	"comment/add" => [
		desc => "добавляет комментарий для недвижимости",
		access => "authall",
		model => "realty",
		param => ["id"=>"id", "msg" => "string", "limitations"=>"string", "rating"=>"uint"],
		func => function($param, $argv) {
			$comment = R::dispense("comment");
			$comment->realty = $argv->model;
			$comment->user = $argv->session->user;
			$comment->msg = $param->msg;
			$comment->rating = $param->rating;
			$comment->limitations = $param->limitations;
			$comment->dt = strftime("%F %T", time());
			R::store($comment);
			$temp_img = R::getAll('select img_id, id from img_temp where user_id=? and realty_id=? order by id', [$argv->session->user->id, $argv->model->id]);
			foreach ($temp_img as $value){
				$img = R::findOne("img", 'id = ?', [$value["img_id"]]);
				$img->sharedComment[] = $comment;
				R::store($img);
				$img_temp = R::findOne("img_temp", 'id = ?', [$value["id"]]);
				R::trash($img_temp);
			}
			$imgs = R::getCol("select img_id from comment_img where comment_id=? order by id", [$comment->id]);
			$comment->name = $comment->user->name;
			$ret = $comment->export();
			$ret["imgs"] = $imgs;
			return $ret;
		}
	],
	"comment/img/load" => [
		desc => "возвращает фотографии для комментария",
		access => "authall",
		model => "realty",
		param => ["id" => "id"],
		func => function($param, $argv) {
			$img = R::getCol("select img_id from img_temp where realty_id=? and user_id = ? order by id", [$param->id, $argv->session->user->id]);
			return $img;
		}
	],
	"comment/erase" => [
		desc => "удаляет комментарий для недвижимости",
		access => "self",
		model => "comment",
		param => ["id"=>"id"],
		func => function($param, $argv) {
			R::trash($argv->model);
			return [];
		}
	],
]);
