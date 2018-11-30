/*global $ */
"use strict";

var _orgs = null
var _clusterize = null;

function getOrganisms(json) {
    _orgs = json
    return json
}

function main() {
    prepareDOM()
    fetch('/api/organism_list')
        .then(function (response) {
            return response.json()
        })
        .then(function (json) {
            var orgs = getOrganisms(json);
            transitionToSearch(orgs);
        });

}

function prepareDOM() {
    var clusterize = new Clusterize({
        rows: [],
        scrollId: 'scrollArea',
        contentId: 'contentArea',
        tag: 'li'
    });
    _clusterize = clusterize

}

function updateDOMSearch(orgs, filter) {
    var html = []
    for (var i = 0; i < orgs.length; i++) {
        if (filter == '' || orgs[i][0].toLowerCase().startsWith(filter) || orgs[i][1].startsWith(filter) || orgs[i][2].toLowerCase().startsWith(filter)) {
            var html_item = '<li><a href="/pathways?name=' + orgs[i][0] + '&prefix=' + orgs[i][1] + '">' + orgs[i][0] + '</a> <span class="uk-text-muted" style="float: right" href="#">' + orgs[i][1] + '</span></li>'
            html.push(html_item)
        }
    }
    _clusterize.update(html)
    $('#scrollArea')[0].scrollTop = 0;
    _clusterize.refresh()
}

function transitionToSearch(orgs) {
    updateDOMSearch(orgs, '')
    $("#load_section").fadeOut(function () {
        $("#load_section").remove();
        $("#search_section").animate({
            opacity: 1
        })

    });
}

function searchDidEdit() {
    var filter = $("#search_bar")[0].value.toLowerCase()
    updateDOMSearch(_orgs, filter)
}

$(document).ready(function () {
    main();
});
