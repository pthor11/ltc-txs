import axios from 'axios'
import {rpc} from './config'

const call = (method, params) => {
    const data = JSON.stringify({
        method,
        params,
        jsonrpc: '1.0',
        id: null
    })

    return axios({
        url: `http://${rpc.url}:${rpc.port}`,
        auth: {
            username: rpc.username,
            password: rpc.password,
        },
        data,
        method: 'post'
    })
}

export default call