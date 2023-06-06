interface Env {
  test_kv: KVNamespace;
}

type Mark = 'x' | 'o';

interface RequestBody {
  position: [number, number];
  mark: Mark;
}

interface Game {
  board: Board;
  winner: false | Mark;
}

type Board = Array<Array<null | Mark>>;

const initialBoardState: Board = [
  [null, null, null],
  [null, null, null],
  [null, null, null],
];

const initialGameState: Game = {
  board: initialBoardState,
  winner: false,
};

const getWinner = ({
  row,
  col,
  board,
  mark,
}: {
  row: number;
  col: number;
  board: Board;
  mark: RequestBody['mark'];
}): null | RequestBody['mark'] => {
  // check row to see if there are 3 in a row
  if (board[row].every((cell) => cell === mark)) {
    return mark;
  }

  // check column to see if there are 3 in a column
  if (board.every((row) => row[col] === mark)) {
    return mark;
  }

  // Check the main diagonal (top-left to bottom-right)
  if (row === col && board.every((row, index) => row[index] === mark)) {
    return mark;
  }

  // Check the secondary diagonal (top-right to bottom-left)
  if (row + col === board.length - 1 && board.every((row, index) => row[board.length - 1 - index] === mark)) {
    return mark;
  }

  return null;
};

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (request.method === 'POST') {
      const requestData: RequestBody = JSON.parse(await request.json());

      const storedGame = await env.test_kv.get('game');

      let board = storedGame ? JSON.parse(storedGame).board : initialGameState;

      const updatedGameState = board;

      const [row, col] = requestData.position;

      if (updatedGameState[row][col] !== null) {
        return Response.json({ error: `cell at row: ${row}, col: ${col} is already taken` });
      }

      updatedGameState[row][col] = requestData.mark;

      const winner = getWinner({ row, col, board, mark: requestData.mark });

      const newGameState = {
        board: updatedGameState,
        winner,
      };

      if (winner) {
        // re-initialise store state
        await env.test_kv.put('game', JSON.stringify(initialGameState));
      } else {
        await env.test_kv.put('game', JSON.stringify(newGameState));
      }

      return Response.json(newGameState);
    } else if (request.method === 'GET') {
      const storedGame = await env.test_kv.get('game');
      if (storedGame) {
        return Response.json(JSON.parse(storedGame));
      }
      await env.test_kv.put('game', JSON.stringify(initialGameState));
      return Response.json(initialGameState);
    } else {
      return new Response(null, { status: 405 });
    }
  },
};
