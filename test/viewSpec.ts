import * as angular from "angular";
import "./util/matchers";
declare var inject;

import {inherit, extend, tail} from "ui-router-core";
import {curry} from "ui-router-core";
import {PathNode} from "ui-router-core";
import {ResolveContext} from "ui-router-core";
import {PathFactory} from "ui-router-core";
import {ng1ViewsBuilder, ng1ViewConfigFactory} from "../src/statebuilders/views";
import {ViewService} from "ui-router-core";
import {StateMatcher, StateBuilder} from "ui-router-core";
import {State} from "ui-router-core";
import {Ng1StateDeclaration} from "../src/interface";

describe('view', function() {
  var scope, $compile, $injector, elem, $controllerProvider, $urlMatcherFactoryProvider;
  let root: State, states: {[key: string]: State};

  beforeEach(angular['mock'].module('ui.router', function(_$provide_, _$controllerProvider_, _$urlMatcherFactoryProvider_) {
    _$provide_.factory('foo', function() {
      return "Foo";
    });
    $controllerProvider = _$controllerProvider_;
    $urlMatcherFactoryProvider = _$urlMatcherFactoryProvider_;
  }));

  let register;
  let registerState = curry(function(_states, stateBuilder, config) {
    let state = inherit(new State(), extend({}, config, {
      self: config,
      resolve: config.resolve || []
    }));
    let built: State  = stateBuilder.build(state);
    return _states[built.name] = built;
  });

  beforeEach(inject(function ($rootScope, _$compile_, _$injector_) {
    scope = $rootScope.$new();
    $compile = _$compile_;
    $injector = _$injector_;
    elem = angular.element('<div>');

    states = {};
    let matcher = new StateMatcher(states);
    let stateBuilder = new StateBuilder(matcher, $urlMatcherFactoryProvider);
    stateBuilder.builder('views', ng1ViewsBuilder);
    register = registerState(states, stateBuilder);
    root = register({name: ""});
  }));

  describe('controller handling', function() {
    let state, path: PathNode[], ctrlExpression;
    beforeEach(() => {
      ctrlExpression = null;
      const stateDeclaration: Ng1StateDeclaration = {
        name: "foo",
        template: "test",
        controllerProvider: ["foo", function (/* $stateParams, */ foo) { // todo: reimplement localized $stateParams
          ctrlExpression = /* $stateParams.type + */ foo + "Controller as foo";
          return ctrlExpression;
        }]
      };

      state = register(stateDeclaration);
      let $view = new ViewService();
      $view._pluginapi._viewConfigFactory("ng1", ng1ViewConfigFactory);

      let states = [root, state];
      path = states.map(_state => new PathNode(_state));
      PathFactory.applyViewConfigs($view, path, states);
    });

    it('uses the controllerProvider to get controller dynamically', inject(function ($view, $q) {
      $controllerProvider.register("AcmeFooController", function($scope, foo) { });
      elem.append($compile('<div><ui-view></ui-view></div>')(scope));

      let view = tail(path).views[0];
      view.load();
      $q.flush();
      expect(ctrlExpression).toEqual("FooController as foo");
    }));
  });
});