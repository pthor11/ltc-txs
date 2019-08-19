import rpc from './rpc'
import TXO from './models/TXO'

const run = async (blockHeight) => {
    try {

        const blockhash_response = await rpc('getblockhash', [blockHeight])

        const blockhash = blockhash_response.data.result

        const block_response = await rpc('getblock', [blockhash])

        const block = block_response.data.result

        if (!block) {
            console.log(`get block height ${blockHeight} failed`)
            setTimeout(start, 1000)
            return Promise.resolve(true)
        }

        let unspentTXOs = []

        for (const txid of block.tx) {
            let rawtx_response = null
            try {
                rawtx_response = await rpc('getrawtransaction', [txid])
            } catch (err) {
                if (err.response.data.error.message === 'The genesis block coinbase is not considered an ordinary transaction and cannot be retrieved') {
                    continue
                }
            }

            const rawtx = rawtx_response.data.result
            const decodetx_response = await rpc('decoderawtransaction', [rawtx])
            const decodetx = decodetx_response.data.result

            for (const input of decodetx.vin) {
                await TXO.findOneAndUpdate({ $and: [{ txid: input.txid }, { n: input.vout }] }, { $set: { spent: decodetx.txid } })
            }

            for (const output of decodetx.vout) {
                const value = output.value
                const type = output.scriptPubKey.type
                const addresses = output.scriptPubKey.addresses
                const n = output.n
                if ((value && type && addresses) && type !== "nonstandard") {
                    const unspentTXO = new TXO({
                        txid: decodetx.txid,
                        height: block.height,
                        time: block.time,
                        value,
                        n,
                        type,
                        addresses
                    })
                    unspentTXOs.push(unspentTXO)
                }
            }
        }

        await TXO.insertMany(unspentTXOs)

        console.log(`block ${blockHeight} get ${block.tx.length} txs`)

        run(blockHeight + 1)

    } catch (error) {
        if (error.response.data.error.code === -8) {
            console.log(`ltc-txs is up to date`)
        } else {
            console.log(error.response.data)
        }
        setTimeout(start, 1000)
    }

}

const rollback = async () => {
    const lastTX = await TXO.findOne({}, { _id: 0, height: 1 }).sort({ height: -1 })
    if (lastTX) {
        await TXO.deleteMany({ height: lastTX.height })
        return Promise.resolve(lastTX.height)
    } else {
        return Promise.resolve(1)
    }
}

const start = async () => {
    try {
        const blockHeight = 2687228 //await rollback()
        console.log({ blockHeight })

        await run(blockHeight)
    } catch (error) {
        console.log(error)
        start()
    }
}

start()