<?php
# Для работы с rb из командной строки:
# $ php -r 'require("rb.php"); print_r($inb);'
require_once "lib/rb.php";
require_once "ini.php";

$inb = $ini["database"];
R::setup($inb["dsn"], $inb["user"], $inb["password"]);
R::freeze(true);