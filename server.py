"""Websockets server to receive data from the JS app"""
import asyncio
import websockets

async def echo(websocket):
    async for message in websocket:
        # await websocket.send(message)
        print(message)

async def main():
    print('starting server')
    async with websockets.serve(echo, "localhost", 8765):
        await asyncio.Future()  # run forever

asyncio.run(main())