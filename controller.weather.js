/**
 * Created by dhkim2 on 2017-11-13.
 */
const request = require('request');
const sprintf = require('sprintf');

class Weather {
    constructor(lang) {
      this.lang = lang;
    }

    _request(url, callback) {
        console.log(url);
        var options = {url: url, json:true, timeout: 5000};
        if (this.lang) {
          options.headers = {
            'Accept-Language': this.lang
          }
        }
        request(options, function (err, response, body) {
            if (err) {
                return callback(err);
            }
            callback(null, body);
        });
    }

    _makeUrl(geoInfo) {
        var url = "https://todayweather.wizardfactory.net/v000803/geo/"+geoInfo.location.lat+"/"+geoInfo.location.lng;
        url +="?key=tw";
        if (geoInfo.country) {
            url += "&country="+geoInfo.country;
        }
        if (geoInfo.address) {
            url += "&address="+encodeURIComponent(geoInfo.address);
        }
        return url;
    }

    getWeatherByGeoInfo(geoInfo, callback) {
        var self= this;
        var url;
        try {
            url = this._makeUrl(geoInfo)
        }
        catch (e) {
            return callback(e);
        }
        this._request(url, function (err, result) {
            if (err) {
                return callback(err);
            }
            self.weatherInfo = result;
            callback(null, result);
        });
    }

    _googleDateStr2kmaDateStr(dateStr) {
        return dateStr.replace(/-/g, "");
    }

    _dsfDateStr2kmaDateStr(dateStr) {
        return dateStr.substr(0, 10).replace(/\./g, "");
    }

    _getPrefixTemp(temp) {
      return temp>0?"영상":temp<0?"영하":"";
    }

    _getHigherLowerStr(dayStr, diff) {
      let msg = "";

      if (diff > 1) {
       msg += dayStr+'보다 '+Math.round(Math.abs(diff))+"도 높은";
      }
      else if (diff < -1) {
        msg += dayStr+'보다 '+Math.round(Math.abs(diff))+"도 낮은";
      }
      else {
          if (dayStr === '어제' && dayStr === '지난 주') {
              msg += dayStr+'와 비슷한';
          }
          else {
              msg += dayStr+'과 비슷한';
          }
      }

      return msg;
    }

    _weekday2str(day) {
        switch (day) {
            case 0:
                return '일요일';
            case 1:
                return '월요일';
            case 2:
                return '화요일';
            case 3:
                return '수요일';
            case 4:
                return '목요일';
            case 5:
                return '금요일';
            case 6:
                return '토요일';
            default:
                console.error("invalid week day="+day);
        }
        return "";
    }

    //2일 토요일
    _makeDaydescription(strDate) {
        let tempDate;
        if (strDate.indexOf('.') >= 0) {
            tempDate = new Date(strDate);
        }
        else {
            tempDate = new Date(strDate.substr(0,4), strDate.substr(4,2)-1, strDate.substr(6,2));
        }

        console.log("strDate: ", strDate, " date: "+tempDate);
        return tempDate.getDate()+"일 "+ this._weekday2str(tempDate.getDay());
    }

    _makeDescription(dayWeather) {
        let msg="";
        if (dayWeather.desc) {
            msg += dayWeather.desc;
        }
        else if (dayWeather.descAm) {
            if (dayWeather.descAm === dayWeather.descPm) {
                msg += dayWeather.descAm;
            }
            else {
                msg+= "오전에는 "+dayWeather.descAm+" 오후에는 "+dayWeather.descPm;
            }
        }
        msg+='입니다.';

        return msg;
    }

  _makeCurrentWeather(locate, current) {
    let msg;
    let diffStr = "";
    if (current.yesterday) {
      if (current.yesterday.temp != undefined) {
        diffStr = this._getHigherLowerStr("어제", current.temp - current.yesterday.temp);
      }
    }

    msg = sprintf("현재 %s %s이고 온도는 %s %s %d도입니다.", locate, current.desc, diffStr,
        this._getPrefixTemp(current.temp),
        Math.round(Math.abs(current.temp)));

    let aqiMsg = "";
    if (current.pm10Value) {
        aqiMsg = sprintf("미세먼지는 %d %s입니다.", current.pm10Value, current.pm10Str);
    }
    else if (current.pm25Value) {
       aqiMsg = sprintf("초미세먼지는 %d %s입니다.", current.pm25Value, current.pm25Str);
    }

    if (aqiMsg.length > 0) {
      msg += ' ' + aqiMsg;
    }

    return msg;
  }

    /**
     * return
     * 현재 $any 하늘은 $desc 이고, 온도는 $temp 입니다.
     * 몇시간 이후 비올 확률은 60%이오니, 우산 챙기세요
     * 몇시간 이후 눈/비가 그칠 예정입니다
     * 미세먼지, 초미세먼지가 나쁘니, 주의하시기 바랍니다.
     * 특보, 주의보 발행중입니다.
     * 바람이 많이 붑니다.
     * 습도가 높습니다. 건조합니다.
     * @param weatherInfo
     */
    getCurrentWeather(parameters, weatherInfo) {
      if (!weatherInfo) {
        weatherInfo = this.weatherInfo;
      }

      let current;
      if (weatherInfo.source === 'KMA') {
        current = this._makeCommonProperties(weatherInfo.current);
        if (current.yesterday) {
          current.yesterday = this._makeCommonProperties(current.yesterday);
        }
      }
      else if (weatherInfo.source === 'DSF') {
        current = this._makeCommonProperties(weatherInfo.thisTime[1]);
        if (weatherInfo.thisTime[0]) {
          current.yesterday = this._makeCommonProperties(weatherInfo.thisTime[0]);
        }
      }

      return this._makeCurrentWeather(parameters.any, current);
    }

    _makeCommonProperties(weatherObject) {
        weatherObject.temp = weatherObject.t1h?weatherObject.t1h:weatherObject.temp;
        weatherObject.temp = weatherObject.temp_c?weatherObject.temp_c:weatherObject.temp;
        weatherObject.temp = weatherObject.t3h?weatherObject.t3h:weatherObject.temp;

        weatherObject.descAm = weatherObject.wfAm?weatherObject.wfAm:weatherObject.descAm;
        weatherObject.descPm = weatherObject.wfPm?weatherObject.wfPm:weatherObject.descPm;
        if (weatherObject.descAm === weatherObject.descPm) {
          weatherObject.desc = weatherObject.descAm;
        }
        weatherObject.desc = weatherObject.weather?weatherObject.weather:weatherObject.desc;

        weatherObject.tempMax = weatherObject.taMax?weatherObject.taMax:weatherObject.tempMax;
        weatherObject.tempMax = weatherObject.tempMax_c?weatherObject.tempMax_c:weatherObject.tempMax;
        weatherObject.tempMin = weatherObject.taMin?weatherObject.taMin:weatherObject.tempMin;
        weatherObject.tempMin = weatherObject.tempMin_c?weatherObject.tempMin_c:weatherObject.tempMin;

        if (weatherObject.dustForecast) {
          weatherObject.dustForecast.location = weatherObject.dustForecast.sido;
        }

        if (weatherObject.arpltn) {
          for (var key in weatherObject.arpltn) {
            weatherObject[key] = weatherObject.arpltn[key];
          }
        }
        return weatherObject;
    }

    //최고기온은 preDayStr 보다 3도 낮은 영상 9도이고, 최저기온은 preDayStr보다 3도 높은 영하2도입니다.
    _makeTempMaxMinDescription(tempMaxMin, preTempMaxMin, preDayStr) {
        let msg;
        if (preTempMaxMin) {
            if (!preDayStr) {
                preDayStr="이전";
            }
            msg = sprintf("최고기온은 %s %s%d도이며, 최저기온은 %s %s%d도입니다.",
            this._getHigherLowerStr(preDayStr, tempMaxMin.tempMax - preTempMaxMin.tempMax),
            this._getPrefixTemp(tempMaxMin.tempMax),
            Math.ceil(Math.abs(tempMaxMin.tempMax)),
            this._getHigherLowerStr(preDayStr, tempMaxMin.tempMin - preTempMaxMin.tempMin),
            this._getPrefixTemp(tempMaxMin.tempMin),
            Math.floor(Math.abs(tempMaxMin.tempMin)));
        }
        else {
          msg = sprintf("최고기온은 %s%d도이며, 최저기온은 %s%d도 입니다.",
              this._getPrefixTemp(tempMaxMin.tempMax),
              Math.ceil(Math.abs(tempMaxMin.tempMax)),
              this._getPrefixTemp(tempMaxMin.tempMin),
              Math.floor(Math.abs(tempMaxMin.tempMin)));
        }
        return msg;
    }

    _makeDailyWeather(parameters, weatherInfo, dayWeatherIndex, dayFromToday) {
      let msg;
      let previousDayIndex;
      let previousDayStr;
      if (dayWeatherIndex < 0) {
        msg  = parameters.date+" "+parameters.any+"의 날씨는 아직 제공하지 않고 있습니다.";
        return msg;
      }

      msg += parameters.any + " ";

      if (dayFromToday == 0) {
        msg = "오늘 ";
        previousDayIndex = dayWeatherIndex-1;
        previousDayStr = "어제";
      }
      else if (dayFromToday == -1) {
        msg = "어제 ";
        previousDayIndex = dayWeatherIndex+1;
        previousDayStr = "오늘";
      }
      else if (dayFromToday == 1) {
        msg = "내일 ";
        previousDayIndex = dayWeatherIndex-1;
        previousDayStr = "오늘";
      }
      else if (dayFromToday == 2) {
        msg = "모레 ";
        previousDayIndex = dayWeatherIndex-2;
        previousDayStr = "오늘";
      }
      else {
        let date = parameters.date.substr(parameters.date.length-3, 2)+"일";
        msg = date+" ";
      }

      let dayWeather;
      let previousDayWeather;

      if (weatherInfo.source === 'KMA') {
        dayWeather = this._makeCommonProperties(weatherInfo.midData.dailyData[dayWeatherIndex]);
        if (previousDayIndex != undefined) {
            previousDayWeather = this._makeCommonProperties(weatherInfo.midData.dailyData[previousDayIndex]);
        }
      }
      else if (weatherInfo.source === 'DSF') {
        dayWeather = this._makeCommonProperties(weatherInfo.daily[dayWeatherIndex]);
        if (previousDayIndex != undefined) {
            previousDayWeather = this._makeCommonProperties(weatherInfo.daily[previousDayIndex]);
        }
      }

      msg += this._makeDescription(dayWeather);

      if (dayWeather.tempMax) {
          msg += this._makeTempMaxMinDescription(dayWeather, previousDayWeather, previousDayStr);
      }

      if(dayWeather.dustForecast) {
        let locationStr = dayWeather.dustForecast.location != parameters.any ? dayWeather.dustForecast.location:"";
        msg += " "+locationStr+" 미세먼지는 "+dayWeather.dustForecast.PM10Str+"으로 예상됩니다."
      }

      return msg;
    }

  /**
   *
   * @param parameters
   * @param weatherInfo
   * @returns {*}
   */
  getSpecificDayWeather(parameters, weatherInfo) {
    if (!weatherInfo) {
      weatherInfo = this.weatherInfo;
    }

    var dateStr = this._googleDateStr2kmaDateStr(parameters.date);
    console.log("date="+dateStr);

    let dayWeatherIndex;
    let dayFromToday;

    if (weatherInfo.source === "KMA") {
      dayFromToday = dateStr - weatherInfo.current.date;

      dayWeatherIndex = weatherInfo.midData.dailyData.findIndex(function (dayWeather) {
        return dayWeather.date === dateStr;
      });
    }
    else if (weatherInfo.source === "DSF") {
      let todayStr = this._dsfDateStr2kmaDateStr(weatherInfo.thisTime[1].date);
      dayFromToday = dateStr === todayStr;
      dayWeatherIndex = weatherInfo.daily.findIndex(function (dayWeather) {
        let strDate = this._dsfDateStr2kmaDateStr(dayWeather.date);
        return strDate === dateStr;
      });
    }

    return this._makeDailyWeather(parameters, weatherInfo, dayWeatherIndex, dayFromToday);
  }

    /**
     *
     * @param str
     * @returns {Array}
     * @private
     */
    _datePeriodStr2arrayKmaDayStr(str) {
      let self = this;
      return str.split('/').map(function (dayStr) {
        return self._googleDateStr2kmaDateStr(dayStr);
      });
    }

    /**
     *
     * @param aDayWeather
     * @private
     */
    _getTempMaxMinFromDatePriod(aDayWeather) {
        return aDayWeather.reduce(function (result, dayWeather) {
              result.tempMin = dayWeather.tempMin < result.tempMin?dayWeather.tempMin:result.tempMin;
              result.tempMax = dayWeather.tempMax > result.tempMax?dayWeather.tempMax:result.tempMax;
              return result;
      });
    }

  /**
   * 26일 토요일은 오전에는 블라브라 오후에는 블라블라 이며, 27일 일요일 오전에는 블라브라 오후에는 블라블라입니다.
   * 최고 기온은 지난주보다 %d도 높은/낮은 몇도이며, 최저기온은 지난주보다 %d 높은/낮은 몇도입니다.
   * 토요일 비올 확율은 60% 이며, 일요일 비올 확율은 50%입니다. / 토요일 비올 확율은 30%입니다. / 일요일 비올 확률은 20%입니다.
   * 미세먼지 나쁨/오전나쁨/오후나쁨 입니다.
   * 2017-11-25/2017-11-26
   * @param parameters
   * @param weatherInfo
   */
  getSpecificWeekEndWeather(parameters, weatherInfo) {
      let self = this;

      if (!weatherInfo) {
          weatherInfo = this.weatherInfo;
      }

      let arrayDayStr;

      arrayDayStr = this._datePeriodStr2arrayKmaDayStr(parameters['date-period']);
      console.log(arrayDayStr);

      let startIndex;
      let endIndex;
      let aRawDayWeather;

      if (weatherInfo.source === "KMA") {
          aRawDayWeather = weatherInfo.midData.dailyData;
      }
      else if (weatherInfo.source === "DSF") {
          aRawDayWeather = weatherInfo.daily;
      }

      startIndex = aRawDayWeather.findIndex(function (dayWeather) {
          return dayWeather.date === arrayDayStr[0];
      });
      endIndex = aRawDayWeather.findIndex(function (dayWeather) {
          return dayWeather.date === arrayDayStr[1];
      });

      let aDayWeather = aRawDayWeather.filter(function (dayWeather, index) {
          if (startIndex <= index && index <= endIndex) {
              return true;
          }
      });

      //토요일 오전에는 맑고, 오후에는 흐리겠습니다. 일요일 오전에는
      let aDayDescription = aDayWeather.map(function (rawDayWeather) {
          let dayWeather = self._makeCommonProperties(rawDayWeather);
          let dayDesc = self._makeDaydescription(dayWeather.date);
          let desc = self._makeDescription(dayWeather);
          return dayDesc+"은 "+desc;
      });

      let msgDay  = "";
      aDayDescription.forEach(function (dayDesc, index) {
          if (index === 0) {
              msgDay += dayDesc;
          }
          else {
              msgDay += " "+dayDesc;
          }
      });

      let tempMaxMin = self._getTempMaxMinFromDatePriod(aDayWeather);
      let preTempMaxMin;

      if (startIndex >= 7) {
          let aPreDayWeather;
          let preStartIndex = startIndex - 7;
          let preEndIndex = endIndex - 7;

          aPreDayWeather = aRawDayWeather.filter(function (dayWeather, index) {
              if (preStartIndex <= index && index <= preEndIndex) {
                  return true;
              }
          });

          aPreDayWeather = aPreDayWeather.map(function (rawDayWeather) {
              return self._makeCommonProperties(rawDayWeather);
          });
          preTempMaxMin = self._getTempMaxMinFromDatePriod(aPreDayWeather);
      }

      let msgTemp = this._makeTempMaxMinDescription(tempMaxMin, preTempMaxMin, "지난 주");

      return msgDay+" "+msgTemp;
  }

  /**
   * 어디 몇시 미세먼지는 33 나쁨이며, 초미세먼지 33 매우나쁨입니다.
   */
  getCurrentAQI(parameters, weatherInfo) {
      if (!weatherInfo) {
          weatherInfo = this.weatherInfo;
      }

      let current;
      let msg;
      let msgPm10;
      let msgPm25;
      let strTime = "";

      try {
          if (weatherInfo.source === 'KMA') {
              current = this._makeCommonProperties(weatherInfo.current);
              strTime = current.dataTime.split(" ")[1].substr(0,2);
          }
          else if (weatherInfo.source === 'DSF') {
              current = this._makeCommonProperties(weatherInfo.thisTime[1]);
          }

          msg = sprintf("%s %s시 ", parameters.any, strTime);
          if (current.pm10Value != undefined)  {
              msgPm10 = sprintf("미세먼지는 %d %s", current.pm10Value, current.pm10Str);
          }
          if (current.pm25Value != undefined) {
              msgPm25 = sprintf("초미세먼지는 %d %s", current.pm25Value, current.pm25Str);
          }
          if (msgPm10 && msgPm25) {
              msg += msgPm10+"이며, "+msgPm25+"입니다.";
          }
          else if (msgPm10) {
              msg += msgPm10+"입니다.";
          }
          else if (msgPm25) {
              msg += msgPm25+"입니다.";
          }
      }
      catch (e) {
          console.error(e);
      }

      return msg;
  }

  /**
   * 오늘/어제/내일/18일 미세먼지는 나쁨/오전 나쁨/오후 나쁨입니다.
   * 오늘/어제/내일/18일 미세먼지는 30~44로 나쁨/오전 나쁨/오후 나쁨입니다.
   * @param date
   */
  getSpecificDayAQI(parameters, weatherInfo) {
      return "아직 지원하지 않는 기능입니다.";
  }

  /**
   * 토요일 오전 나쁨이며, 오후 좋음이며, 일요일 나쁨/오전나쁨/오후나쁨입니다.
   * 2017-11-25/2017-11-26
   * @param datePeriod
   */
  getSpecificWeekEndAQI(parameters, weatherInfo) {
      return "아직 지원하지 않는 기능입니다.";
  }

}

module.exports = Weather;

