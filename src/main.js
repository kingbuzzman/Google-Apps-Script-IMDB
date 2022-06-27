function _fill(str, length) {
    str = String(str);
    while (str.length < length)
        str = '0' + str;
    return str;
}

function _hash(string) {
    var key = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, string)  
                       .map(function(chr){return (chr + 256).toString(16).slice(-2)})
                       .join('');
    return key;
}

class BaseIMDB {

  static _cacheCheck(key, callback, format, ttl) {
    key = `${this.cachePrefix}_${key}`;
    var cached = this.cache.get(key);
    try {
      if (cached != null) {
        this.log(`found in cache: ${key}`, cached);
        return format(cached);
      }
    } catch(error) {}
    var data = callback();
    if (data == null) {
      this.log(`cannot cache: ${key}`, data);
      throw new Error("Bad cache");
    }
    this.log(`caching!: ${key}`, data);
    this.cache.put(key, data, ttl);
    return format(data);
  }

  static log() {
    console.log.apply(console, arguments);
  }

  static now() {
    return new Date();
  }

  static _request(url) {
    /***
     * 
     * Handles requests
     * 
     * Fails if there is an issue
     *  
     * ***/
    var response = this.fetchUrl(url);
    var rawData = response.getContentText();
    var statusCode = response.getResponseCode();
    this.log(url, statusCode, rawData);
    if (statusCode !== 200) {
      throw new Error("Bad response", statusCode);
    }
    return rawData;
  }

  static request(url) {
    /***
     * 
     * Handles requesting, caching and parsing
     *  
     * ***/
    var key = `${this.cachePrefix}_${_hash(url)}`;
    var cached = this.cache.get(key);
    try {
      if (cached != null) {
        this.log(`found in cache: ${key}`, cached);
        return JSON.parse(cached);
      }
    } catch(error) {}

    cached = this._request(url);
    this.log(`cached!: ${key}`, cached);
    this.cache.put(key, cached, this.CACHE_URL); 
    return JSON.parse(cached);
  }

}

BaseIMDB.CACHE_URL = 60 * 30; // 30 min
BaseIMDB.CACHE_FUNCTION = 60 * 6; // 6 hours -- maximum allowed
BaseIMDB.fetchUrl = UrlFetchApp.fetch;
BaseIMDB.cache = CacheService.getScriptCache();

class OMDBAPI extends BaseIMDB {

  static detailURL(imdbId) {
    if (!imdbId) {
      this.log(`Ignoring.. bad id`, imdbId);
      throw new Error("No id given");
    }
    return `https://www.omdbapi.com/?i=${imdbId}&apikey=${this.APIKEY}`;
  }

  static seasonDetailURL(imdbId, season) {
    if (!imdbId) {
      this.log(`Ignoring.. bad id`, imdbId);
      throw new Error("No id given");
    } else if (!season || isNaN(parseInt(season))) {
      this.log(`Ignoring.. season id`, season);
      throw new Error("No season id given");
    }
    return `https://www.omdbapi.com/?i=${imdbId}&apikey=${this.APIKEY}&season=${season}`;
  }

  static _request(url) {
    /***
     * 
     * Handles requests
     * 
     * Fails if there is an issue
     *  
     * ***/
    var rawData = super._request(url)
    var data = JSON.parse(rawData);
    if (data.hasOwnProperty('Response') && data["Response"] == "False") {
      throw new Error("Invalid response", data);
    }
    return rawData;
  }

  static getRatings(imdbId) {
    var self = this;
    var url = this.detailURL(imdbId);
    var callback = function() {
      var data = self.request(url);
      return data['imdbRating'];
    }
    return this._cacheCheck(`rating:${imdbId}`, callback, parseFloat, this.CACHE_FUNCTION);
  }

  static _getValidEpisode(season, episodes) {
    var currentDate = this.now();
    this.log(season, episodes);
    for (var i = episodes.length - 1; i >= 0; i--) {
      if (episodes[i]['Released'] == 'N/A') {
        this.log(`Skipping episode ${season}:${i+1}: unreleased`);
        continue;
      }
      var dateSince = (currentDate - (new Date(episodes[i]['Released'])));
      this.log(`Episode ${season}:${i+1} ${dateSince}`);
      if (dateSince > 0) {
        this.log(`Episode ${season}:${i+1}: found!`);
        return episodes[i];
      }
    }
    return null;
  }

  static getCurrentSeason(imdbId) {
    var self = this;
    var url = this.detailURL(imdbId);
    var callback = function() {
      var data = self.request(url);
      var season = data['totalSeasons'];
      while (season) {
        var seasonDetail = self.request(self.seasonDetailURL(imdbId, season));
        var episode = self._getValidEpisode(season, seasonDetail['Episodes']);
      
        if (!episode) {
          self.log(`Season ${season} has no episodes ${imdbId}`);
          season -= 1;
          continue;
        }

        return season;
      }
      throw new Error("Bad season");
    }
    return this._cacheCheck(`current_season:${imdbId}`, callback, parseInt, this.CACHE_FUNCTION);
  }

  static getCurrentSeasonEpisode(imdbId, season) {
    var self = this;
    var url = this.seasonDetailURL(imdbId, season);
    var callback = function() {
      var data = self.request(url);  
      var episode = self._getValidEpisode(season, data['Episodes']);
      if (episode) {
        return episode['Episode'];
      }
      self.log(`Ignoring.. bad episode response`, episode);
      throw new Error("Bad season episode");
    }
    return this._cacheCheck(`current_episode:${imdbId}:${season}`, callback, parseInt, this.CACHE_FUNCTION);
  }

  static getCurrentSeasonEpisodeReleased(imdbId, season) {
    var self = this;
    var url = this.seasonDetailURL(imdbId, season);
    var callback = function() {
      var data = self.request(url);
      var episode = self._getValidEpisode(season, data['Episodes']);
      if (episode) {
        return episode['Released'];
      }
      self.log(`Ignoring.. bad episode response`, episode);
      throw new Error("Bad season episode");
    }
    return this._cacheCheck(`current_episode_released:${imdbId}:${season}`, callback, String, this.CACHE_FUNCTION);
  }

}

OMDBAPI.cachePrefix = 'omdb';

class MyAPIFilms extends BaseIMDB {

  static detailURL(imdbId) {
    if (!imdbId) {
      this.log(`Ignoring.. bad id`, imdbId);
      throw new Error("No id given");
    }
    return `https://www.myapifilms.com/imdb/idIMDB?idIMDB=${imdbId}&token=${this.APIKEY}&seasons=1&language=en-us`;

  }

  static getRatings(imdbId) {
    var self = this;
    var url = this.detailURL(imdbId);
    var callback = function() {
      var data = self.request(url);
      return data['data']['movies'][0]['rating'];
    }
    return this._cacheCheck(`rating:${imdbId}`, callback, parseFloat, this.CACHE_FUNCTION);
  }

  static _getValidEpisode(season, seasonEpisodes) {
    var currentDate = this.now();
    this.log(season, seasonEpisodes);
    var latestSeason = [];
    var episodesBySeason = {};
    for (const detail of seasonEpisodes || []) {
      var epDetails = episodesBySeason[detail.season] = [];
      for (const episode of detail.episodes) {
        var releasedDate = new Date(`${episode.date.slice(0, 4)}-${episode.date.slice(4, 6)}-${episode.date.slice(6, 8)}`);
        var dateSince = currentDate - releasedDate;
        this.log(`Episode ${season}:${episode.episode} ${dateSince}`);
        if (dateSince > 0) {
          latestSeason.push(detail.season);
          epDetails.push({
            "season": detail.season,
            "episode": episode.episode,
            "date": releasedDate
          });
        }
      }
    }
    if (season === '?') {
      season = Math.max(...latestSeason)
    }
    return episodesBySeason[season].slice(-1)[0];
  }

  static getCurrentSeason(imdbId) {
    var self = this;
    var url = this.detailURL(imdbId);
    var callback = function() {
      var data = self.request(url);
      var episode = self._getValidEpisode('?', data['data']['movies'][0]['seasons']['seasonsBySeason']);
      if (episode) {
        return episode['season'];
      }
      self.log(`Ignoring.. bad season response`, episode);
      throw new Error("Bad season");
    }
    return this._cacheCheck(`current_season:${imdbId}`, callback, parseInt, this.CACHE_FUNCTION);
  }

  static getCurrentSeasonEpisode(imdbId, season) {
    var self = this;
    var url = this.detailURL(imdbId);
    var callback = function() {
      var data = self.request(url);  
      var episode = self._getValidEpisode(season, data['data']['movies'][0]['seasons']['seasonsBySeason']);
      if (episode) {
        return episode['episode'];
      }
      self.log(`Ignoring.. bad episode response`, episode);
      throw new Error("Bad season episode");
    }
    if (!season || isNaN(parseInt(season))) {
      this.log(`Ignoring.. season id`, season);
      throw new Error("No season id given");
    }
    return this._cacheCheck(`current_episode:${imdbId}:${season}`, callback, parseInt, this.CACHE_FUNCTION);
  }

  static getCurrentSeasonEpisodeReleased(imdbId, season) {
    var self = this;
    var url = this.detailURL(imdbId);
    var callback = function() {
      var data = self.request(url);
      var episode = self._getValidEpisode(season, data['data']['movies'][0]['seasons']['seasonsBySeason']);
      if (episode) {
        return `${episode['date'].getFullYear()}-${_fill(episode['date'].getMonth(), 2)}-${_fill(episode['date'].getDate(), 2)}`;
      }
      self.log(`Ignoring.. bad episode response`, episode);
      throw new Error("Bad season episode");
    }
    if (!season || isNaN(parseInt(season))) {
      this.log(`Ignoring.. season id`, season);
      throw new Error("No season id given");
    }
    return this._cacheCheck(`current_episode_released:${imdbId}:${season}`, callback, String, this.CACHE_FUNCTION);
  }

}

MyAPIFilms.cachePrefix = 'myapi';