const tap = require('tap')

class FakeURLResponse {
    constructor(statusCode, response) {
        this.response = response;
        this.statusCode = statusCode;
    }

    getContentText() {
        return this.response;
    }

    getResponseCode() {
        return this.statusCode;
    }
}

class FakeCache {
    constructor() {
        this.cache = {};
    }

    get(key) {
        if (key in this.cache) {
        return this.cache[key];
        }
        return null;
    }

    put(key, value, ttl) {
        this.cache[key] = value;
    }
}

class MockOMDBAPI extends OMDBAPI {}
MockOMDBAPI.APIKEY = 'key';
MockOMDBAPI.cache = new FakeCache();
MockOMDBAPI.log = function() {}
MockOMDBAPI.fetchUrl = function() {
    throw Error("Not meant to see this!");
}
MockOMDBAPI.now = function() {
    return new Date(2000, 1, 1);
}


class MockMyAPIFilms extends MyAPIFilms {}
MockMyAPIFilms.APIKEY = 'key';
MockMyAPIFilms.cache = new FakeCache();
MockMyAPIFilms.log = function() {}
MockMyAPIFilms.fetchUrl = function() {
    throw Error("Not meant to see this!");
}
MockMyAPIFilms.now = function() {
    return new Date(2000, 1, 1);
}

// eval(UrlFetchApp.fetch('https://raw.githubusercontent.com/huan/gast/master/src/gas-tap-lib.js').getContentText())



tap.test('_fill', function (t) {
    t.equal(_fill('', 0), '');
    t.equal(_fill('1', 0), '1');
    t.equal(_fill('1', 1), '1');
    t.equal(_fill('1', 2), '01');
    t.equal(_fill('10', 0), '10');
    t.equal(_fill('10', 1), '10');
    t.equal(_fill('10', 2), '10');
    t.equal(_fill('10', 3), '010');
    t.equal(_fill(0, 0), '0');
    t.equal(_fill(1, 0), '1');
    t.equal(_fill(1, 1), '1');
    t.equal(_fill(1, 2), '01');
    t.equal(_fill(10, 0), '10');
    t.equal(_fill(10, 1), '10');
    t.equal(_fill(10, 2), '10');
    t.equal(_fill(10, 3), '010');
})


tap.test('OMDBAPI.detailURL', function (t) {
    class Mock extends MockOMDBAPI {}

    try {
    Mock.detailURL()
    t.notok(false, 'no exception was thrown')
    } catch(e) {
    t.ok(true, 'exception was thrown')
    }

    t.equal(Mock.detailURL('something'), 'https://www.omdbapi.com/?i=something&apikey=key')
})

tap.test('OMDBAPI.seasonDetailURL', function (t) {
    class Mock extends MockOMDBAPI {}

    try {
    Mock.seasonDetailURL()
    t.notok(false, 'no exception was thrown')
    } catch(e) {
    t.ok(true, 'exception was thrown')
    }

    try {
    Mock.seasonDetailURL('something')
    t.notok(false, 'no exception was thrown')
    } catch(e) {
    t.ok(true, 'exception was thrown')
    }

    try {
    Mock.seasonDetailURL('something', 'error')
    t.notok(false, 'no exception was thrown')
    } catch(e) {
    t.ok(true, 'exception was thrown')
    }

    t.equal(Mock.seasonDetailURL('something', '1'), 'https://www.omdbapi.com/?i=something&apikey=key&season=1')
})

tap.test('OMDBAPI.getRatings', function (t) {
    class Mock extends MockOMDBAPI {};
    MockOMDBAPI.cache = new FakeCache();

    Mock.fetchUrl = function(url) {
    return new FakeURLResponse(200, '{"Response":"True", "imdbRating": "9.9"}');
    }
    t.equal(Mock.getRatings('tt0000001'), "9.9");

    // cache governs results
    Mock.cache.cache['omdb_rating:tt0000001'] = '9.8'
    t.equal(Mock.getRatings('tt0000001'), "9.8");
})

tap.test('OMDBAPI.getCurrentSeason', function (t) {
    class Mock extends MockOMDBAPI {};
    MockOMDBAPI.cache = new FakeCache();

    try {
    Mock.fetchUrl = function(url) {
        if (url.includes("season=")) {
        return new FakeURLResponse(200, '{"Episodes": [],"Response":"True"}');  
        }
        return new FakeURLResponse(200, '{"totalSeasons":"4","Response":"True"}');
    }
    Mock.getCurrentSeason('tt0000000');
    t.notok(false, 'no exception was thrown')
    } catch(e) {
    t.ok(true, 'exception was thrown')
    }

    Mock.fetchUrl = function(url) {
    if (url.includes("season=")) {
        return new FakeURLResponse(200, '{"Episodes": [{"Released": "N/A"}, {"Released": "2000-01-01"}],"Response":"True"}');  
    }
    return new FakeURLResponse(200, '{"totalSeasons":"4","Response":"True"}');
    }
    t.equal(Mock.getCurrentSeason('tt0000001'), 4);

    // cache governs results
    Mock.cache.cache['omdb_current_season:tt0000001'] = '3'
    t.equal(Mock.getCurrentSeason('tt0000001'), 3);
})

tap.test('OMDBAPI.getCurrentSeasonEpisode', function (t) {
    class Mock extends MockOMDBAPI {};
    MockOMDBAPI.cache = new FakeCache();

    try {
    Mock.fetchUrl = function(url) {
        return new FakeURLResponse(200, '{"Episodes": [],"Response":"True"}');
    }
    Mock.getCurrentSeasonEpisode('tt0000000', 4);
    t.notok(false, 'no exception was thrown')
    } catch(e) {
    t.ok(true, 'exception was thrown')
    }

    Mock.fetchUrl = function(url) {
    return new FakeURLResponse(200, '{"Episodes": [{"Released": "N/A", "Episode": "1"}, {"Released": "2000-01-01", "Episode": "2"}], "Response":"True"}');
    }
    t.equal(Mock.getCurrentSeasonEpisode('tt0000001', 4), 2);

    // cache governs results
    Mock.cache.cache['omdb_current_episode:tt0000001:4'] = '3'
    t.equal(Mock.getCurrentSeasonEpisode('tt0000001', 4), 3);
})

tap.test('OMDBAPI.getCurrentSeasonEpisodeReleased', function (t) {
    class Mock extends MockOMDBAPI {};
    MockOMDBAPI.cache = new FakeCache();

    try {
    Mock.fetchUrl = function(url) {
        return new FakeURLResponse(200, '{"Episodes": [],"Response":"True"}');
    }
    Mock.getCurrentSeasonEpisodeReleased('tt0000000', 4);
    t.notok(false, 'no exception was thrown')
    } catch(e) {
    t.ok(true, 'exception was thrown')
    }

    Mock.fetchUrl = function(url) {
    return new FakeURLResponse(200, '{"Episodes": [{"Released": "N/A", "Episode": "1"}, {"Released": "2000-01-01", "Episode": "2"}], "Response":"True"}');
    }
    t.equal(Mock.getCurrentSeasonEpisodeReleased('tt0000001', 4), '2000-01-01');

    // cache governs results
    Mock.cache.cache['omdb_current_episode_released:tt0000001:4'] = '2000-01-05'
    t.equal(Mock.getCurrentSeasonEpisodeReleased('tt0000001', 4), '2000-01-05');
})


var validEmptyResponse = {
    "data": {
    "movies": [
        {
        "seasons": {
            "seasonsBySeason": [
            {
                "season": 1,
                "episodes": []
            }
            ]
        },
        "rating": "9.9"
        }
    ]
    },
    "about": {
    "version": "2.50.4",
    "serverTime": "2022/06/27 14:03:32"
    }
}

var validReallyEmptyResponse = {
    "data": {
    "movies": [
        {
        "seasons": {
            "seasonsBySeason": []
        },
        "rating": "9.9"
        }
    ]
    },
    "about": {
    "version": "2.50.4",
    "serverTime": "2022/06/27 14:03:32"
    }
}

var validResponse = {
    "data": {
    "movies": [
        {
        "year": 2020,
        "releaseDate": "20200508",
        "writers": [
            {
            "id": "nm0572982",
            "name": "Mike McMahan"
            },
            {
            "id": "nm1551598",
            "name": "Justin Roiland"
            }
        ],
        "runtime": 22,
        "countries": [
            "United States"
        ],
        "languages": [
            "English"
        ],
        "plot": "Episode plot..",
        "simplePlot": "Shorter plot...",
        "seasons": {
            "seasonsBySeason": [
            {
                "season": 4,
                "episodes": [
                {
                    "episode": 1,
                    "numSeason": 4,
                    "date": "20010101",
                    "idIMDB": "tt14905054",
                    "title": "Episode title.."
                },
                {
                    "episode": 2,
                    "numSeason": 4,
                    "date": "20010101",
                    "idIMDB": "tt14929826",
                    "title": "Episode title.."
                },
                {
                    "episode": 3,
                    "numSeason": 4,
                    "date": "20010101",
                    "idIMDB": "tt14949650",
                    "title": "Episode title.."
                },
                {
                    "episode": 4,
                    "numSeason": 4,
                    "date": "20010101",
                    "idIMDB": "tt14967870",
                    "title": "Episode title.."
                }
                ]
            },
            {
                "season": 3,
                "episodes": [
                {
                    "episode": 1,
                    "numSeason": 3,
                    "date": "20000713",
                    "idIMDB": "tt12753254",
                    "title": "Episode title.."
                },
                {
                    "episode": 2,
                    "numSeason": 3,
                    "date": "20000713",
                    "idIMDB": "tt14196378",
                    "title": "Episode title.."
                },
                {
                    "episode": 3,
                    "numSeason": 3,
                    "date": "20000713",
                    "idIMDB": "tt14196416",
                    "title": "Episode title.."
                },
                {
                    "episode": 4,
                    "numSeason": 3,
                    "date": "20000713",
                    "idIMDB": "tt14196420",
                    "title": "Episode title.."
                }
                ]
            },
            {
                "season": 2,
                "episodes": [
                {
                    "episode": 1,
                    "numSeason": 2,
                    "date": "19990326",
                    "plot": "Episode plot..",
                    "urlPoster": "http://domain/pic.jpg",
                    "idIMDB": "tt8910966",
                    "title": "Episode title.."
                },
                {
                    "episode": 2,
                    "numSeason": 2,
                    "date": "19990326",
                    "plot": "Episode plot..",
                    "urlPoster": "http://domain/pic.jpg",
                    "idIMDB": "tt8910964",
                    "title": "Episode title.."
                },
                {
                    "episode": 3,
                    "numSeason": 2,
                    "date": "19990326",
                    "plot": "Episode plot..",
                    "urlPoster": "http://domain/pic.jpg",
                    "idIMDB": "tt8910968",
                    "title": "Episode title.."
                },
                {
                    "episode": 4,
                    "numSeason": 2,
                    "date": "19990326",
                    "plot": "Episode plot..",
                    "urlPoster": "http://domain/pic.jpg",
                    "idIMDB": "tt8910970",
                    "title": "Episode title.."
                }
                ]
            },
            {
                "season": 1,
                "episodes": [
                {
                    "episode": 1,
                    "numSeason": 1,
                    "date": "19980508",
                    "plot": "Episode plot..",
                    "urlPoster": "http://domain/pic.jpg",
                    "idIMDB": "tt8910940",
                    "title": "Episode title.."
                },
                {
                    "episode": 2,
                    "numSeason": 1,
                    "date": "19980508",
                    "plot": "Episode plot..",
                    "urlPoster": "http://domain/pic.jpg",
                    "idIMDB": "tt8910942",
                    "title": "Episode title.."
                },
                {
                    "episode": 3,
                    "numSeason": 1,
                    "date": "19980508",
                    "plot": "Episode plot..",
                    "urlPoster": "http://domain/pic.jpg",
                    "idIMDB": "tt8910944",
                    "title": "Episode title.."
                },
                {
                    "episode": 4,
                    "numSeason": 1,
                    "date": "19980508",
                    "plot": "Episode plot..",
                    "urlPoster": "http://domain/pic.jpg",
                    "idIMDB": "tt8910948",
                    "title": "Episode title.."
                }
                ]
            }
            ]
        },
        "rating": "9.9",
        "rated": "TV-MA",
        "votes": "20K",
        "type": "TV_SERIES",
        "idIMDB": "tt8910922",
        "title": "Episode title..",
        "urlIMDB": "https://www.imdb.com/title/tt8910922/",
        "urlPoster": "http://domain/pic.jpg"
        }
    ]
    },
    "about": {
    "version": "2.50.4",
    "serverTime": "2022/06/27 14:03:32"
    }
}

tap.test('MyAPIFilms.detailURL', function (t) {
    class Mock extends MockMyAPIFilms {}

    try {
        Mock.detailURL()
        t.notok(false, 'no exception was thrown')
    } catch(e) {
        t.ok(true, 'exception was thrown')
    }

    t.equal(Mock.detailURL('something'), 'https://www.myapifilms.com/imdb/idIMDB?idIMDB=something&token=key&seasons=1&language=en-us')
})

tap.test('MyAPIFilms.getRatings', function (t) {
    class Mock extends MockMyAPIFilms {};
    MockMyAPIFilms.cache = new FakeCache();

    Mock.fetchUrl = function(url) {
        return new FakeURLResponse(200, JSON.stringify(validResponse));
    }
    t.equal(Mock.getRatings('tt0000001'), "9.9");

    // cache governs results
    Mock.cache.cache['myapi_rating:tt0000001'] = '9.8'
    t.equal(Mock.getRatings('tt0000001'), "9.8");
})

tap.test('MyAPIFilms.getCurrentSeason', function (t) {
    class Mock extends MockMyAPIFilms {};
    MockMyAPIFilms.cache = new FakeCache();

    Mock.fetchUrl = function(url) {
        return new FakeURLResponse(200, JSON.stringify(validResponse));
    }
    t.equal(Mock.getCurrentSeason('tt0000001'), 2);

    // cache governs results
    Mock.cache.cache['myapi_current_season:tt0000001'] = '3'
    t.equal(Mock.getCurrentSeason('tt0000001'), 3);
})

tap.test('MyAPIFilms.getCurrentSeasonEpisode', function (t) {
    class Mock extends MockMyAPIFilms {};
    MockMyAPIFilms.cache = new FakeCache();

    try {
    Mock.fetchUrl = function(url) {
        return new FakeURLResponse(200, JSON.stringify(validReallyEmptyResponse));
    }
    Mock.getCurrentSeasonEpisode('tt0000000', 4);
        t.notok(false, 'no exception was thrown')
    } catch(e) {
        t.ok(true, 'exception was thrown')
    }

    Mock.fetchUrl = function(url) {
        return new FakeURLResponse(200, JSON.stringify(validResponse));
    }
    t.equal(Mock.getCurrentSeasonEpisode('tt0000001', 2), 4);

    // cache governs results
    Mock.cache.cache['myapi_current_episode:tt0000001:2'] = '3'
    t.equal(Mock.getCurrentSeasonEpisode('tt0000001', 2), 3);
})

tap.test('MyAPIFilms.getCurrentSeasonEpisodeReleased', function (t) {
    class Mock extends MockMyAPIFilms {};
    MockMyAPIFilms.cache = new FakeCache();

    try {
    Mock.fetchUrl = function(url) {
        return new FakeURLResponse(200, JSON.stringify(validReallyEmptyResponse));
    }
    Mock.getCurrentSeasonEpisodeReleased('tt0000000', 2);
        t.notok(false, 'no exception was thrown')
    } catch(e) {
        t.ok(true, 'exception was thrown')
    }

    Mock.fetchUrl = function(url) {
        return new FakeURLResponse(200, JSON.stringify(validResponse))
    }
    t.equal(Mock.getCurrentSeasonEpisodeReleased('tt0000001', 2), '1999-02-25');

    // cache governs results
    Mock.cache.cache['myapi_current_episode_released:tt0000001:2'] = '2000-01-05'
    t.equal(Mock.getCurrentSeasonEpisodeReleased('tt0000001', 2), '2000-01-05');
})