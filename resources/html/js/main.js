$(document).ready(function(){

  $(".scroll").click(function(event){		
  	event.preventDefault();
  	$('html,body').animate({scrollTop:$(this.hash).offset().top}, 1000);
  	
  });
});

function redirectToWunderlist(ev) {
	ev.preventDefault();
	// Redirects keeping all request parameters
	document.location.href = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize' + document.location.search;
}