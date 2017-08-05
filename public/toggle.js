var toggles = document.getElementsByClassName('toggle');
for(var i = 0; i < toggles.length; i++){
    toggles[i].addEventListener('click', function(){
        var el = this.nextElementSibling;
        el.style.display = (el.style.display == 'block' ? 'none' : 'block');
    });
}

var todos = document.getElementsByClassName('todo');
for(var i = 0; i < todos.length; i++){
    todos[i].addEventListener('click', function(){
    	this.style.textDecoration = (this.style.textDecoration == 'line-through' ? 'none' : 'line-through');
	});
}

var removeIcons = document.getElementsByClassName('fa-times');
for(var i = 0; i < removeIcons.length; i++){
	removeIcons[i].addEventListener('click', function(){
		this.parentElement.nextElementSibling.submit();
	});
}