hive.api.setOptions({ url: 'https://api.hive.blog' });
const api = hive.api;



let counter = document.getElementById("counterCountsHIvers");

window.onload = api.getAccountCount(function(err, result) {
  counter.innerHTML = `<p>Registered accounts</p> ${result}`;
});

setInterval(()=> {
  api.getAccountCount(function(err, result) {
    counter.innerHTML = `<p>Cuentas registradas</p> ${result}`;
  });
  
},300000)

const activateButton = document.getElementById("activateFetch");
const inputUser = document.getElementById("inputUser");

activateButton.addEventListener("click",fechBlog);
activateButton.addEventListener("keydown",(e)=> {
  if(e.key === "Enter") {
    fechBlog();
  }
});

inputUser.addEventListener("keydown",(e)=> {
  
  if(e.key === "Enter") {
   e.preventDefault()
    fechBlog();
     }
  
});


function fechBlog() {
let listPost = document.getElementById("postList");
listPost.innerHTML = " ";

    const query = {
        tag: inputUser.value,
        limit: 5,
                
    };

    
 
      api.getDiscussionsByBlog(query, function(e, res) {

        try {

          
          
            res.forEach(post => {
                const json = JSON.parse(post.json_metadata);
                const image = json.image ? json.image[0] : '';
                const title = post.title;
                const author = post.author;
                const url = post.url;
                const urlPlus = `https://peakd.com${url}`;
                const created = new Date(post.created).toDateString();

                
                const containerTitle = document.createElement("h2");
                containerTitle.append(title);
                const containerAuthor = document.createElement("p");
                containerAuthor.append(`by ${author}`);

                const centerImage = document.createElement("div")
                const containerImage = document.createElement("img");
                containerImage.setAttribute("src", image);
                containerImage.style.maxWidth = "450px"
                centerImage.append(containerImage)
                centerImage.style.display ="flex"
                centerImage.style.justifyContent ="center"
                const containerCreated = document.createElement("p");
                containerCreated.append(`${created}`);               
                const buttonLink = document.createElement("button");                
                buttonLink.innerHTML = "Ver post...";
                listPost.append(containerTitle,containerAuthor, centerImage,containerCreated,buttonLink);
    
          buttonLink.addEventListener("click", (e) => {
            e.preventDefault()
            
            window.open(urlPlus);
          })
            
        })

        
      }

                   
        catch {
          
          const ContainerMsgError = document.createElement("h2");
          const msgError = "Introduce un nombre de usuario válido"
          ContainerMsgError.style.color = "#900";
          ContainerMsgError.append (msgError);          
          listPost.append(ContainerMsgError);
        }
        
        
      })

}