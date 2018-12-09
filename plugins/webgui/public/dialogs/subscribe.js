const app = angular.module('app');
const window = require('window');
const cdn = window.cdn || '';

app.factory('subscribeDialog', [ '$mdDialog', '$http', ($mdDialog, $http) => {
  const publicInfo = { linkType: 'ss', ip: '0' };
  const hide = () => {
    return $mdDialog.hide()
    .then(success => {
      dialogPromise = null;
      return;
    }).catch(err => {
      dialogPromise = null;
      return;
    });
  };
  publicInfo.hide = hide;
  const getSubscribe = () => {
    return $http.get(`/api/user/account/${ publicInfo.accountId }/subscribe`);
  };
  publicInfo.getSubscribe = getSubscribe;
  const updateSubscribe = () => {
    return $http.put(`/api/user/account/${ publicInfo.accountId }/subscribe`);
  };
  publicInfo.updateSubscribe = updateSubscribe;
  publicInfo.getSurgeLink = (data) => {
    const url = 'https://api.vpsny.app/tools/ss2surge/configs'; 
      return $http.post(url, data).then(data => {
        return data.data;
      });
  };
  let dialogPromise = null;
  const isDialogShow = () => {
    if(dialogPromise && !dialogPromise.$$state.status) {
      return true;
    }
    return false;
  };
  const dialog = {
    templateUrl: `${ cdn }/public/views/dialog/subscribe.html`,
    escapeToClose: false,
    locals: { bind: publicInfo },
    bindToController: true,
    controller: ['$scope', '$mdMedia', '$mdDialog', 'bind', 'configManager', '$mdToast', function($scope, $mdMedia, $mdDialog, bind, configManager, $mdToast) {
      $scope.publicInfo = bind;
      const config = configManager.getConfig();
      $scope.changeLinkType = () => {
        if($scope.publicInfo.linkType === 'surge'){
          if($scope.publicInfo.subscribeLink === 'loading'){
            $scope.publicInfo.getSurgeLink({
              id: $scope.publicInfo.token,
              name: 'SS-VPSNY',
              ss: `${ config.site}/api/user/account/subscribe/${$scope.publicInfo.token}?type=quan&ip=${$scope.publicInfo.ip}`,
              template: 'https://raw.githubusercontent.com/ConnersHua/Profiles/master/SurgeNG.conf'
            }).then(url => {
              $scope.publicInfo.subscribeLink = url;
            });
          }
        }else{
          $scope.publicInfo.subscribeLink = `${ config.site }/api/user/account/subscribe/${ $scope.publicInfo.token }?type=${$scope.publicInfo.linkType}&ip=${ $scope.publicInfo.ip}`;
        }
      };
      $scope.publicInfo.getSubscribe().then(success => {
        $scope.publicInfo.token = success.data.subscribe;
        $scope.publicInfo.subscribeLink = `${ config.site }/api/user/account/subscribe/${ $scope.publicInfo.token }?type=${$scope.publicInfo.linkType}&ip=${ $scope.publicInfo.ip}`;
      });
      $scope.publicInfo.surgeLink = () => {
        $scope.publicInfo.linkType = 'surge';
        $scope.publicInfo.subscribeLink = 'loading';
        
      };
      $scope.publicInfo.updateLink = () => {
        $scope.publicInfo.updateSubscribe().then(success => {
          $scope.publicInfo.token = success.data.subscribe;
          $scope.publicInfo.subscribeLink = `${ config.site }/api/user/account/subscribe/${ $scope.publicInfo.token }?type=${$scope.publicInfo.linkType}&ip=${ $scope.publicInfo.ip}`;
        });
      };
      $scope.toast = () => {
        $mdToast.show(
          $mdToast.simple()
            .textContent('链接已复制到剪贴板')
            .position('top right')
            .hideDelay(3000)
        );
      };
    }],
    fullscreen: false,
    clickOutsideToClose: true,
  };
  const show = accountId => {
    if(isDialogShow()) {
      return dialogPromise;
    }
    publicInfo.accountId = accountId;
    dialogPromise = $mdDialog.show(dialog);
    return dialogPromise;
  };
  return {
    show,
  };
}]);
