import React from 'react';
import { Container, Row, Col, Table, Button } from 'react-bootstrap/';
import 'bootstrap/dist/css/bootstrap.min.css';
import {
  Line,
  LineChart,
  XAxis,
  YAxis,
  Tooltip, 
  CartesianGrid,
  ResponsiveContainer
} from 'recharts';

import './styles/App.css';
import {socket} from './server'

class App extends React.Component{
  constructor() {
    super();
    
    this.state = {
      exchange: {},
      stocks: {},
      ready_stock: false,
      ready_exchange: false,
      on: true
    };
    this.disconnect = this.disconnect.bind(this);
  }
  
  getInitialStock() {
    console.log('hola')
    let copyStocks = {};
    socket.emit('STOCKS');
    socket.on('STOCKS', (data) => {
      console.log(data)
      for (const num in data) {
        
        copyStocks[data[num]['ticker']] = {
          'company_name': data[num]['company_name'],
          'country': data[num]['country'],
          'total_volume': 0,
          'higher': 0,
          'lower': 0,
          'last_price': 0,
          'porcentual_change': 0,
          'data': [],
        };
      }
      this.setState({ stocks: copyStocks, ready_stock: true });
    });
  }

  getInitialExchange(){
    let copyExchange = {}
    let stocks = {}
    socket.emit('STOCKS')
    socket.on('STOCKS', (data) => {
      stocks = data
    });
    socket.emit('EXCHANGES')
    socket.on('EXCHANGES', (data) => {
      
      for (const num in data) {
        copyExchange[data[num]['exchange_ticker']] = {
          'company_ticker': [],
          'exchange_name': data[num]['name'],
          'country': data[num]['country'],
          'stocks':[...data[num]['listed_companies']],
          'total_volume': 0,
          'sell_volume': 0,
          'buy_volume': 0,
          'quantity': ([...data[num]['listed_companies']]).length,
          'participation': 0
        }
        for (var i in stocks){
          if (data[num]['listed_companies'].indexOf(stocks[i]['company_name']) >= 0){
            copyExchange[data[num]['exchange_ticker']]['company_ticker'].push(stocks[i]['ticker'])
        }}      
      }
      this.setState({ exchange: copyExchange, ready_exchange: true });
    });
  }

  updateStock() {
    socket.on('UPDATE',(data) => {
      if (this.state.ready_stock && this.state.ready_exchange){
        var date = new Date(data['time'] * 1000)
        var hours = date.getHours()
        var minutes = "0" + date.getMinutes()
        var formattedTime = hours + ':' + minutes.substr(-2)
        let copyStocks = { ...this.state.stocks };
        copyStocks[data['ticker']]['data'].push({'time':formattedTime, value :data['value']});
        if (copyStocks[data['ticker']]['lower']=== 0 || copyStocks[data['ticker']]['lower'] > data['value']){
          copyStocks[data['ticker']]['lower'] = data['value']
        }
        if (copyStocks[data['ticker']]['higher'] < data['value']){
          copyStocks[data['ticker']]['higher'] = data['value']
        }
        copyStocks[data['ticker']]['porcentual_change'] = Math.round(((data['value']*100/copyStocks[data['ticker']]['last_price'])-100) * 100) / 100
        copyStocks[data['ticker']]['last_price'] = data['value']
        this.setState({ stocks: copyStocks })
      }
    });
  }

  tickerBuy() {
    socket.on('BUY',(data) => {
      if (this.state.ready_stock && this.state.ready_exchange){
        let copyStocks = {...this.state.stocks }
        let copyExchange = { ...this.state.exchange }
        let market_total = 0
        copyStocks[data['ticker']]['total_volume'] = data['volume'] + copyStocks[data['ticker']]['total_volume']
        for (const ex in copyExchange){
          if (copyExchange[ex]['company_ticker'].indexOf(data['ticker']) >= 0){
            copyExchange[ex]['buy_volume'] = data['volume'] + copyExchange[ex]['buy_volume']
            copyExchange[ex]['total_volume'] = data['volume'] + copyExchange[ex]['total_volume']
          }
          market_total = market_total + copyExchange[ex]['total_volume']
        }
        for (const ex in copyExchange){
          copyExchange[ex]['participation'] = Math.round(((copyExchange[ex]['total_volume']*100)/market_total) * 100) / 100
        }
        this.setState({ stocks: copyStocks, exchange: copyExchange })
      }
    });
  }

  tickerSell() {
    socket.on('SELL',(data) => {
      if (this.state.ready_stock && this.state.ready_exchange){
        let copyStocks = {...this.state.stocks }
        let copyExchange = {...this.state.exchange}
        let market_total = 0
        copyStocks[data['ticker']]['total_volume'] = data['volume'] + copyStocks[data['ticker']]['total_volume']
        for (const ex in  copyExchange){
          if (copyExchange[ex]['company_ticker'].indexOf(data['ticker']) >= 0){
            copyExchange[ex]['sell_volume'] = data['volume'] + copyExchange[ex]['sell_volume']
            copyExchange[ex]['total_volume'] = data['volume'] + copyExchange[ex]['total_volume']
          }
          market_total = market_total + copyExchange[ex]['total_volume']
        }
        for (const ex in copyExchange){
          copyExchange[ex]['participation'] = Math.round(((copyExchange[ex]['total_volume']*100)/market_total) * 100) / 100
        }
        this.setState({ stocks: copyStocks, exchange: copyExchange })
      }
    });
  }

  disconnect(){
    if (socket.connected){
      socket.disconnect()
      this.setState({ on : false })
    }
    else {
      socket.connect()
      this.setState({ on : true })
    }
  }

  componentDidMount() {
    this.getInitialStock();
    this.getInitialExchange();
    this.updateStock();
    this.tickerSell();
    this.tickerBuy();
 }

  
  render () {
    // console.log(this.state.stocks)
    if (this.state.ready_stock && this.state.ready_exchange) {
      const { stocks } = this.state;
      const { exchange } = this.state;
      const { on } = this.state;
      
      return (
        <div className="container" style={{backgroundColor: '#2C2F38'}}>
          <div style={{width: '90vw', marginBottom: '40px'}}>
            <Row>
              <Col md={{ span: 3, offset: 4 }}>
                <div style={{justifyContent:'center', textAlign: 'center'}}>
                  <h3 style={{fontSize: '26px', fontWeight: 'bold', color: '#FCACB8'}}>Stock Exchange Market</h3>
                </div>
              </Col>
              <Col md={{ span: 2, offset: 3 }}>
                <Button variant="secondary" size="sm" onClick={this.disconnect}>{on ? 'Desconectar Socket' : 'Conectar Socket'}</Button> 
              </Col>
            </Row>
          </div>
          {
            Object.keys(exchange).map((key, index) => (
             <div style={{width: '90vw', marginBottom: '35px'}}>
                <Row style={{backgroundColor: '#2C2F38'}}>
                  <Col xs={12} md={6}>
                    <p style={{fontSize: '20px', fontWeight: 'bold', color: 'white', textTransform: 'uppercase'}} key={index}>
                      {exchange[key]['exchange_name']}
                    </p>
                  </Col>
                  <Col xs={6} md={6}>
                    <Table className="table table-sm table-bordered">
                      <thead>
                        <tr style={{color: '#8C8F9C', fontSize: '12px'}}>
                          <th style={{borderColor: '#8C8F9C'}} align="center">Volumen Compra</th>
                          <th style={{borderColor: '#8C8F9C'}} align="center">Volumen Venta</th>
                          <th style={{borderColor: '#8C8F9C'}} align="center">Volumen Total</th>
                          <th style={{borderColor: '#8C8F9C'}} align="center">Cantidad Acciones</th>
                          <th style={{borderColor: '#8C8F9C'}} align="center">Participación Mercado</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr style={{color: 'white', fontSize: '14px'}}>
                          <td style={{borderColor: '#8C8F9C'}} align="center">{exchange[key]['buy_volume']}</td>
                          <td style={{borderColor: '#8C8F9C'}} align="center">{exchange[key]['sell_volume']}</td>
                          <td style={{borderColor: '#8C8F9C'}} align="center">{exchange[key]['total_volume']}</td>
                          <td style={{borderColor: '#8C8F9C'}} align="center">{exchange[key]['quantity']}</td>
                          <td style={{borderColor: '#8C8F9C'}} align="center">{exchange[key]['participation']}</td>
                        </tr>
                      </tbody>
                    </Table>
                  </Col>
                </Row>
                <Row>
                {
                  Object.values(exchange[key]['company_ticker']).map((ticker, j) => (
                    <Col xs={6}>
                      <Container align="center" width="150%">
                        <p style={{fontSize: '16px', color: 'white'}} key={j}>
                          {stocks[ticker]['company_name']}
                        </p>
                        <p style={{fontSize: '14px', color: '#8C8F9C'}}>
                          {stocks[ticker]['country']} - {ticker}
                        </p>
                        <ResponsiveContainer height={300} width='100%'>
                          <LineChart
                              width={650}
                              height={350}
                              data={[...stocks[ticker]['data']]}
                              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                            >
                            <CartesianGrid strokeDasharray="3 3" stroke='#8C8F9C'/>
                            <XAxis stroke='#8C8F9C' dataKey="time" />
                            <YAxis stroke='#8C8F9C' domain={["dataMin - 10", "dataMax + 10"]}/>
                            <Tooltip 
                              itemStyle={{ fontWeight: "bold" }}
                              formatter={function(value, name) {
                                return `USD ${value}`;
                              }}
                              labelFormatter={function(value) {
                                return `time: ${value}`;
                              }}
                            />
                            <Line type="monotone" dataKey='value' stroke="#E95765" fill="#E95765" strokeWidth="3" />
                            </LineChart>  
                        </ResponsiveContainer>
                        <Row style={{marginTop: '20px', marginLeft: '20px'}}>
                          <Table className="table table-sm table-bordered">
                            <thead>
                              <tr style={{color: '#8C8F9C', fontSize: '12px'}}>
                                <th style={{borderColor: '#8C8F9C'}} align="center">Volumen Total</th>
                                <th style={{borderColor: '#8C8F9C'}} align="center">Alto Histórico</th>
                                <th style={{borderColor: '#8C8F9C'}} align="center">Bajo Histórico</th>
                                <th style={{borderColor: '#8C8F9C'}} align="center">Último Precio</th>
                                <th style={{borderColor: '#8C8F9C'}} align="center">Cambio Porcentual</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr style={{color: 'white', fontSize: '14px'}}>
                                <td style={{borderColor: '#8C8F9C'}} align="center">{stocks[ticker]['total_volume']}</td>
                                <td style={{borderColor: '#8C8F9C'}} align="center">{stocks[ticker]['higher']}</td>
                                <td style={{borderColor: '#8C8F9C'}} align="center">{stocks[ticker]['lower']}</td>
                                <td style={{borderColor: '#8C8F9C'}} align="center">{stocks[ticker]['last_price']}</td>
                                <td style={{borderColor: '#8C8F9C'}} align="center">{stocks[ticker]['porcentual_change']}</td>
                              </tr>
                            </tbody>
                          </Table>
                        </Row>                       
                      </Container>
                    </Col>
                  ))
                }
                </Row>
              </div>
            ))
          }
        </div>
      );
    } else { 
      return( 
        <div className="container">
        </div>
      ); 
    }
  }
    
} 

export default App;