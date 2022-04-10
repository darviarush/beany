<?php
require_once 'lib/UnitCase.php';

class CommentTest extends UnitCase {

	public function testModel() {
		R::freeze( false );
		
		$comment = R::dispense("comment");
		$comment->user = R::dispense("user");
		$comment->realty = R::dispense("realty");
		$comment->dt = "2006-01-01 01:24:56";
		$comment->msg = "Тестовый Comment";
		$comment->limitations = "Тестовый Comment";
		$comment->rating = 1;
		$comment->count_rat = 1;
		R::store($comment);
		
		$img = R::dispense("img");
		$img->sharedComment[] = $comment;
		R::store($img);

		R::freeze( true );
	}

    public function testComment() {
		$app = self::$app;
        $app->plugins->loadOne("comment");
		$this->assertTrue(true);
    }
}
