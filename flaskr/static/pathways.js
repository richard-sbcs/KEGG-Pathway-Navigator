/*global $ */
"use strict";

var _pathways = null
var _clusterize = null
var _clusterize2 = null
var _selected_pathways = []
var _search_text = ""
var _json_results = null
var _initial_load = false
var _state = 0;
var _prefix = "null";

function getPathways(json) {
    _pathways = json
    return json
}

function main() {
    prepareDOM()
    fetch('/api/pathways', {
            method: "post",
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },

            body: JSON.stringify(_prefix)
        }).then(function (response) {
            return response.json()
        })
        .then(function (json) {
            if (json.length == 0) {
                transitionToSearch(true)
            } else {
                var pathways = getPathways(json);
                transitionToSearch();
            }

        });

}

function prepareDOM() {
    $('#submit').on('click', submit);
    $('#add_all').on('click', add_all);
    $('#remove_all').on('click', remove_all);
    $('#back_button').on('click', back_action);
    $('#download').on('click', download);
    $('#download_csv').on('click', download_csv);
    refresh_buttons();
    var param = new URLSearchParams(window.location.search).get('name');
    _prefix = new URLSearchParams(window.location.search).get('prefix');
    $('#org_name')[0].innerHTML = param + ' [' + _prefix + ']';
    var clusterize = new Clusterize({
        rows: [],
        scrollId: 'scrollArea',
        contentId: 'contentArea',
        tag: 'tr'
    });
    _clusterize = clusterize

    $('#contentArea').on('click', 'button', function () {
        var $row = $(this).closest("tr")
        var children = $row.children('td')
        _selected_pathways.push([children[0].innerText, children[1].innerText])
        updateDOMSearch(_pathways, _selected_pathways, _search_text)
        refresh_buttons()
    });



    var clusterize2 = new Clusterize({
        rows: [],
        scrollId: 'scrollArea2',
        contentId: 'contentArea2',
        tag: 'tr'
    });
    _clusterize2 = clusterize2

    $('#contentArea2').on('click', 'button', function () {
        var $row = $(this).closest("tr")
        var children = $row.children('td')

        _selected_pathways = _selected_pathways.filter(function (x) {
            return x[1] !== children[1].innerText
        })
        updateDOMSearch(_pathways, _selected_pathways, _search_text)
        refresh_buttons()

    });

}

function updateDOMSearch(pathways, selected_pathways, filter) {
    var html = []

    for (var i = 0; i < pathways.length; i++) {
        var skip = false
        for (var j = 0; j < selected_pathways.length; j++) {
            if (pathways[i][1] == selected_pathways[j][1]) {
                skip = true
                break
            }
        }
        if (skip) {
            continue
        }

        if (filter == '' || pathways[i][0].toLowerCase().includes(filter) || pathways[i][1].startsWith(filter)) {
            var html_item = '<tr><td width="80%">' + pathways[i][0] + '</td><td width="14%">' + pathways[i][1] + '</td><td width="6%">' + '<button class = "uk-button uk-button-primary uk-button-small" > + </button></td></tr>'
            html.push(html_item)
        }
    }
    var html2 = []
    for (var i = 0; i < selected_pathways.length; i++) {
        var html_item = '<tr><td width="80%">' + selected_pathways[i][0] + '</td><td width="14%">' + selected_pathways[i][1] + '</td><td width="6%">' + '<button class = "uk-button uk-button-danger uk-button-small" > - </button></td></tr>'
        html2.push(html_item)
    }
    _clusterize.update(html)
    _clusterize.refresh()
    _clusterize2.update(html2)
    _clusterize2.refresh()

}

function transitionToSearch(error = false) {
    if (!_initial_load) {
        if (!error) {
            updateDOMSearch(_pathways, _selected_pathways, '')
        }
        $("#load_section").fadeOut(function () {
            if (error) {
                $('#alert_box').fadeIn('slow');
            } else {
                $("#search_section").animate({
                    opacity: 1
                })
            }

        });
        _initial_load = true
    } else {
        $("#results_section").fadeOut(function () {
            $("#search_section").fadeIn(function () {

            })
            $("#about_section").fadeIn(function () {


            })
        });
    }
}

function back_action() {
    if (_state == 0) {
        window.location.href = "/"
    } else {
        _state = 0
        transitionToSearch()
    }
}

function transitionToLoad() {
    $("#load_section").fadeIn(function () {

    })
    $("#search_section").fadeOut(function () {

    })
    $("#results_section").fadeOut(function () {

    })
    $("#about_section").fadeOut(function () {

    })
}

function transitionToResults(error = false) {
    $("#search_section").fadeOut(function () {

    })
    $("#load_section").fadeOut(function () {
        if (error) {
            $('#alert_box').fadeIn('slow');
        } else {
            $("#results_section").fadeIn(function () {
                _state = 1
            })
        }

    })

    /*
    $("#load_section").fadeOut(function () {
        $("#load_section").remove();
        $("#search_section").animate({
            opacity: 1
        })

    });*/
}


function searchDidEdit() {
    var filter = $("#search_bar")[0].value.toLowerCase()
    _search_text = filter
    updateDOMSearch(_pathways, _selected_pathways, _search_text)
    $('#scrollArea')[0].scrollTop = 0;
}

$(document).ready(function () {
    main();
});


function add_all() {
    _selected_pathways = _pathways
    updateDOMSearch(_pathways, _selected_pathways, _search_text)
    refresh_buttons()

}

function remove_all() {
    _selected_pathways = []
    updateDOMSearch(_pathways, _selected_pathways, _search_text)
    refresh_buttons()
}

function refresh_buttons() {
    if (_selected_pathways.length > 0) {
        $('#remove_all').prop('disabled', false);
        $('#submit').prop('disabled', false);
    } else {
        $('#remove_all').prop('disabled', true);
        $('#submit').prop('disabled', true);
    }

    if (_pathways == null) {
        $('#add_all').prop('disabled', false);
    } else if (_selected_pathways.length == _pathways.length) {
        $('#add_all').prop('disabled', true);
    } else {
        $('#add_all').prop('disabled', false);
    }
}

// JS download trick.
function download() {
    var results_str = ""
    var in_desc = $('#inc_desc').is(":checked")
    for (var i = 0; i < _json_results.length; i++) {
        var x = 'n/a'
        if (in_desc) {
            x = _json_results[i][1]
        }
        results_str += _json_results[i][0] + '\t' + x + '\t' + rm_comma(_json_results[i][2]) + '\n'
    }
    var element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(results_str));
    element.setAttribute('download', 'KEGG_Pathway_genes_' + _prefix + '.gmt');
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
}


function rm_quote(str) {
    return str.replace(/"/g, "'");
}

function download_csv() {
    var results_str = ""
    var in_desc = $('#inc_desc').is(":checked")
    for (var i = 0; i < _json_results.length; i++) {
        var x = 'n/a'
        if (in_desc) {
            x = rm_quote(_json_results[i][1])
        }
        results_str += '"' + rm_quote(_json_results[i][0]) + '"' + ',' + '"' + x + '"' + ',' + '"' + rm_quote(_json_results[i][2]) + '"' + '\n'
    }
    var element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(results_str));
    element.setAttribute('download', 'KEGG_Pathway_genes_' + _prefix + '.csv');
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
}


function rm_comma(str) {
    return str.replace(/, /g, '\t');
}

function submit() {
    window.scrollTo(0, 0)
    transitionToLoad()
    fetch('/api/gene', {
            method: "post",
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },

            body: JSON.stringify(_selected_pathways)
        }).then(function (response) {
            return response.json()
        })
        .then(function (json) {
            _json_results = json
            if (json.length == 0) {
                transitionToResults(true)
            } else {

                var html = []
                for (var i = 0; i < json.length; i++) {
                    var html_item = '<tr><td>' + json[i][0] + '</td><td>' + json[i][1] + '</td><td>' + json[i][2] + '</td></tr>'
                    html.push(html_item)
                }

                $("#results_body")[0].innerHTML = html.join("")
                transitionToResults()
            }
        });
}
