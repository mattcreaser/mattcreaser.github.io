/*jshint browser:true*/

$(function() {
  'use strict';

  var ranks = new PowerRanks({
    league: 'Halifax FF Friendly',
    teams: ['The Creasarions', 'Creaser\'s Crunchers', 'TeamDiscoveryChannel', 'The Mooks', 'Pocket Dogs', 'LIQUORPIGS', 'The Wildcats', 'The Bird Men', 'Demolition', 'Myrden\'s Marauders', 'W. C. Coyotes', 'Cotton\'sBoldStrategy'],
    el: '#output',
    template: '#template',
    graph: '#graph'
  });

  window.ranks = ranks;

  if (window.location.hash) {
    var week = parseInt(window.location.hash.substr(1), 10);
    ranks.setWeek({ context: week });
  }
});

function makeTeam (name, rank) {
  return {
    name: name,
    rank: rank,
    index: rank,
    blurb: '',
    last: null,
    change: null,
    high: null,
    low: null
  };
}

function compareTeams(a, b) { return (a.rank > b.rank) ? 1 : ((a.rank < b.rank) ? -1 : 0); }

function PowerRanks (opts) {
  this.teams = opts.teams.map(makeTeam);

  var item = localStorage.getItem('power_ranks');
  this.history = item ? JSON.parse(item) :
    _.reduce(this.teams, function(obj, team) {
      obj.teams.push(team.name);
      return obj;
    }, {
      teams: [],
      weeks: [],
    });

  // Dynamically set team names from stored data.
  var self = this;
  this.history.teams.forEach(function(teamName, i) {
    self.teams[i].name = teamName;
  });

  var weeks = [];
  for (var i = 0; i < 14; ++i) { 
    this.history.weeks[i] = this.history.weeks[i] || [];
    weeks.push(i); 
  }

  this.data = {
    teams: this.teams,
    weeks: weeks,
    week: 0
  };

  this.updateTeams();
  this.sortTeams();

  this.ractive = new Ractive({
    el: opts.el,
    template: opts.template,
    data: this.data,
    magic: true
  });

  this.ractive.on('save', this.save.bind(this));
  this.ractive.on('refresh', this.update.bind(this));
  this.ractive.on('setWeek', this.setWeek.bind(this));

  this.drawGraph(opts.graph);

  $('body').on('copy', '#copy', this.copy.bind(this));
}

PowerRanks.prototype.drawGraph = function(container) {
  var series = _.map(this.teams, function(team) {
    return { name: team.name, data: [] };
  });

  var self = this;
  _.forEach(this.history.weeks, function(data, week) {
    _.forEach(data, function(data, teamIndex) {
      _.find(series, { name: self.history.teams[teamIndex] }).data.push(data.rank + 1);
    });
  });

  _.sortBy(series, function(item) { return item.data[0]; });

  var opts = {
    title: { text: 'Halifax FF Friendly Power Ranks' },
    series: series,
    legend: {
      layout: 'vertical',
      align: 'left',
      verticalAlign: 'middle',
      itemMarginTop: 4,
      itemMarginBottom: 4,
      y: -6
    },
    yAxis: {
      title: { text: 'Rank' },
      reversed: true,
      min: 1, max: 12,
      tickInterval: 1,
      opposite: true
    },
    xAxis: {
      title: { text: 'Week' },
      tickInterval: 1,
      max: 13
    },
    chart: {
      width: 900,
      height: 400
    },
    exporting: {
      scale: 1
    }
  };

  //console.log(opts);

  $(container).highcharts(opts);
};

PowerRanks.prototype.update = function() {
  this.teams.forEach(function(team, i) { team.rank = i; });
  this.storeHistory();
  this.updateTeams();
};

PowerRanks.prototype.setWeek = function(event) {
  this.storeHistory();
  this.data.week = event.context;
  this.updateTeams();
  this.sortTeams();
};

PowerRanks.prototype.sortTeams = function() {
  this.teams.sort(compareTeams);
};

PowerRanks.prototype.updateTeams = function() {
  var self = this;
  var week = this.data.week;

  this.teams.forEach(function(team, i) {
    var history = self.history.weeks[week][team.index];

    team.rank = history ? history.rank : i;
    team.blurb = history ? history.blurb : team.blurb;

    if (week <= 0) { return; }

    var priorHistory = self.history.weeks[week - 1][team.index];
    team.last = priorHistory && priorHistory.rank;
    team.change = priorHistory && team.last - team.rank;

    if (team.change > 0) {
      team.change = '+' + team.change;
    }

    team.high = team.rank;
    team.low = team.rank;
    for(var j = 0; j < week; ++j) {
      team.high = Math.min(team.high, self.history.weeks[j][team.index].rank);
      team.low = Math.max(team.low, self.history.weeks[j][team.index].rank);
    }
    
  });
};

PowerRanks.prototype.storeHistory = function() {
  var self = this;
  this.teams.forEach(function(team, i) {
    self.history.teams[team.index] = team.name;
    self.history.weeks[self.data.week][team.index] = { rank: i, blurb: team.blurb };
  });
};

PowerRanks.prototype.save = function(event) {
  this.storeHistory();
  localStorage.setItem('power_ranks', JSON.stringify(this.history));
};

PowerRanks.prototype.copy = function(/* ClipboardEvent */ e) {
  var clone = $('.teams').clone();
  clone.find('[contenteditable=true]').removeAttr('contenteditable');
  var html = clone.html();

  e.clipboardData.clearData();
  e.clipboardData.setData("text/html", html);
  e.preventDefault();
};
