import React, { Component } from 'react';
import {NotificationContainer, NotificationManager} from 'react-notifications';
import 'react-notifications/lib/notifications.css';

import 'bootstrap/dist/css/bootstrap.css';
import 'font-awesome/css/font-awesome.css'



import '../style.css';

class Home extends Component {
constructor(props){

  super(props)

  this.state ={
    apikey:localStorage.getItem('@heavybots:token')
  }



}
handleDeleteLocalStorage  = ()=>{

localStorage.removeItem("@heavybots:token");
NotificationManager.success('Dados excluidos com sucesso!', 'Concluido!');
 this.setState({apiKey:null});

}



handleLocalStorage (event){

event.preventDefault();
let apiKey = this.state.apikey;


if(!apiKey || apiKey.split(" ")[0] !== "Key" ){

NotificationManager.error('Adicione um chave valida!', 'Erro!');
 return false
}

localStorage.setItem('@heavybots:token',apiKey);

NotificationManager.success('Dados gravados com sucesso!', 'Concluido!');

}
  render() {

    return (
          <>

        <main role="main" class="container">
          <div class="my-3 p-3 bg-white rounded shadow-sm">
              <h4 class="border-bottom border-gray pb-2 mb-0">Configuração</h4>
              <br/>
                <div className="form-group text-grey">
                <label for="exampleFormControlInput1">Key</label>
                <input type="apikey" className="form-control"
               onChange = {(event) => this.setState({apikey:event.target.value})}
                 id="exampleFormControlInput1" value={this.state.apikey}/>
          </div>



               { this.state.apiKey === undefined?
              <div class="container-button">
               <button class="btn btn-primary btn" onClick={(event) => this.handleLocalStorage(event)}>Gravar</button>

              </div>: <div class="container-button">
               <button class="btn btn-primary btn" onClick={(event) => this.handleDeleteLocalStorage(event)}>Excluir</button>

              </div>
              }
            </div>
             <NotificationContainer/>
        </main>

          </>
    );
  }
}

export default Home;
