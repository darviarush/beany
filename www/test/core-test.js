/**
 *  @file
 *  core-testers.js
 *  - содержимое тестов из предыдущего core-test.js
 *
 *  @file
 *  core-testers-add-new.js
 *  - содержимое для новых тестов, первый шаг на пути к модульному распределению
 */
( function () {

    var stamp = new Date().getMinutes();

    $.getScript( 'core-testers.js?time='+ stamp );
    $.getScript( 'core-testers-add-new.js?time='+ stamp );
}());