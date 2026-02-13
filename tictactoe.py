import pygame
import sys
import time
from random import choice, shuffle

# Colors
BLACK = (0, 0, 0)
WHITE = (255, 255, 255)
GRAY = (200, 200, 200)
RED = (220, 50, 50)
BLUE = (50, 50, 220)
GREEN = (50, 180, 50)
LIGHT_BLUE = (230, 240, 255)

# Game constants
WINDOW_WIDTH = 400
WINDOW_HEIGHT = 500
BOARD_SIZE = 300
CELL_SIZE = BOARD_SIZE // 3
BOARD_OFFSET_X = (WINDOW_WIDTH - BOARD_SIZE) // 2
BOARD_OFFSET_Y = 80
LINE_WIDTH = 3
MARK_WIDTH = 4
MARK_PADDING = 25

# Game states
STATE_MENU = "menu"
STATE_PLAYING = "playing"
STATE_GAME_OVER = "game_over"


class TicTacToe:
    def __init__(self):
        pygame.init()
        self.screen = pygame.display.set_mode((WINDOW_WIDTH, WINDOW_HEIGHT))
        pygame.display.set_caption("Tic Tac Toe")
        self.clock = pygame.time.Clock()
        self.font_large = pygame.font.Font(None, 48)
        self.font_medium = pygame.font.Font(None, 36)
        self.font_small = pygame.font.Font(None, 28)

        self.state = STATE_MENU
        self.two_player = False
        self.board = [0] * 9  # 0=empty, 1=X, 2=O
        self.current_player = 1  # 1=X, 2=O
        self.winner = 0
        self.winning_line = None
        self.scores = {"X": 0, "O": 0, "Draw": 0}

    def reset_board(self):
        self.board = [0] * 9
        self.current_player = 1
        self.winner = 0
        self.winning_line = None

    def cell_from_mouse(self, pos):
        """Convert mouse position to board cell index (0-8), or None if outside board."""
        mx, my = pos
        if (BOARD_OFFSET_X <= mx < BOARD_OFFSET_X + BOARD_SIZE and
                BOARD_OFFSET_Y <= my < BOARD_OFFSET_Y + BOARD_SIZE):
            col = (mx - BOARD_OFFSET_X) // CELL_SIZE
            row = (my - BOARD_OFFSET_Y) // CELL_SIZE
            return row * 3 + col
        return None

    def check_winner(self):
        """Check for a winner or draw. Sets self.winner and self.winning_line."""
        lines = [
            (0, 1, 2), (3, 4, 5), (6, 7, 8),  # rows
            (0, 3, 6), (1, 4, 7), (2, 5, 8),  # cols
            (0, 4, 8), (2, 4, 6),              # diagonals
        ]
        for a, b, c in lines:
            if self.board[a] != 0 and self.board[a] == self.board[b] == self.board[c]:
                self.winner = self.board[a]
                self.winning_line = (a, b, c)
                return True

        if all(cell != 0 for cell in self.board):
            self.winner = -1  # draw
            return True
        return False

    def computer_move(self):
        """Simple AI: win if possible, block opponent, then pick center/corner/edge."""
        # Try to win
        for i in range(9):
            if self.board[i] == 0:
                self.board[i] = 2
                if self.check_winner() and self.winner == 2:
                    self.winner = 0
                    self.winning_line = None
                    return i
                self.board[i] = 0
                self.winner = 0
                self.winning_line = None

        # Block opponent from winning
        for i in range(9):
            if self.board[i] == 0:
                self.board[i] = 1
                if self.check_winner() and self.winner == 1:
                    self.winner = 0
                    self.winning_line = None
                    self.board[i] = 0
                    return i
                self.board[i] = 0
                self.winner = 0
                self.winning_line = None

        # Take center
        if self.board[4] == 0:
            return 4

        # Take a corner
        corners = [0, 2, 6, 8]
        shuffle(corners)
        for c in corners:
            if self.board[c] == 0:
                return c

        # Take an edge
        edges = [1, 3, 5, 7]
        shuffle(edges)
        for e in edges:
            if self.board[e] == 0:
                return e

        return None

    def make_move(self, cell):
        """Place current player's mark at cell. Returns True if valid."""
        if self.board[cell] != 0:
            return False
        self.board[cell] = self.current_player
        return True

    def draw_board(self):
        """Draw the 3x3 grid lines."""
        for i in range(1, 3):
            # Vertical lines
            x = BOARD_OFFSET_X + i * CELL_SIZE
            pygame.draw.line(self.screen, BLACK,
                             (x, BOARD_OFFSET_Y),
                             (x, BOARD_OFFSET_Y + BOARD_SIZE), LINE_WIDTH)
            # Horizontal lines
            y = BOARD_OFFSET_Y + i * CELL_SIZE
            pygame.draw.line(self.screen, BLACK,
                             (BOARD_OFFSET_X, y),
                             (BOARD_OFFSET_X + BOARD_SIZE, y), LINE_WIDTH)

    def draw_marks(self):
        """Draw X's and O's on the board."""
        for i in range(9):
            row, col = divmod(i, 3)
            cx = BOARD_OFFSET_X + col * CELL_SIZE + CELL_SIZE // 2
            cy = BOARD_OFFSET_Y + row * CELL_SIZE + CELL_SIZE // 2
            half = CELL_SIZE // 2 - MARK_PADDING

            if self.board[i] == 1:  # X
                pygame.draw.line(self.screen, RED,
                                 (cx - half, cy - half), (cx + half, cy + half), MARK_WIDTH)
                pygame.draw.line(self.screen, RED,
                                 (cx + half, cy - half), (cx - half, cy + half), MARK_WIDTH)
            elif self.board[i] == 2:  # O
                pygame.draw.circle(self.screen, BLUE, (cx, cy), half, MARK_WIDTH)

    def draw_winning_line(self):
        """Draw a line through the winning cells."""
        if self.winning_line is None:
            return
        a, _, c = self.winning_line
        row_a, col_a = divmod(a, 3)
        row_c, col_c = divmod(c, 3)
        start = (BOARD_OFFSET_X + col_a * CELL_SIZE + CELL_SIZE // 2,
                 BOARD_OFFSET_Y + row_a * CELL_SIZE + CELL_SIZE // 2)
        end = (BOARD_OFFSET_X + col_c * CELL_SIZE + CELL_SIZE // 2,
               BOARD_OFFSET_Y + row_c * CELL_SIZE + CELL_SIZE // 2)
        color = RED if self.winner == 1 else BLUE
        pygame.draw.line(self.screen, color, start, end, 6)

    def draw_text_centered(self, text, y, font=None, color=BLACK):
        if font is None:
            font = self.font_medium
        surface = font.render(text, True, color)
        rect = surface.get_rect(center=(WINDOW_WIDTH // 2, y))
        self.screen.blit(surface, rect)

    def draw_button(self, text, rect, hover=False):
        color = LIGHT_BLUE if hover else WHITE
        pygame.draw.rect(self.screen, color, rect, border_radius=8)
        pygame.draw.rect(self.screen, BLACK, rect, 2, border_radius=8)
        surface = self.font_small.render(text, True, BLACK)
        text_rect = surface.get_rect(center=rect.center)
        self.screen.blit(surface, text_rect)

    def draw_menu(self):
        self.screen.fill(WHITE)
        self.draw_text_centered("Tic Tac Toe", 80, self.font_large)
        self.draw_text_centered("Choose a mode:", 160, self.font_small, GRAY)

        mouse_pos = pygame.mouse.get_pos()
        self.btn_1p = pygame.Rect(100, 200, 200, 50)
        self.btn_2p = pygame.Rect(100, 270, 200, 50)

        self.draw_button("1 Player (vs AI)", self.btn_1p, self.btn_1p.collidepoint(mouse_pos))
        self.draw_button("2 Players", self.btn_2p, self.btn_2p.collidepoint(mouse_pos))

    def draw_playing(self):
        self.screen.fill(WHITE)
        mode = "vs AI" if not self.two_player else "2 Player"
        self.draw_text_centered(f"Tic Tac Toe  -  {mode}", 30, self.font_small, GRAY)

        # Turn indicator
        if self.current_player == 1:
            self.draw_text_centered("X's turn", 58, self.font_small, RED)
        else:
            self.draw_text_centered("O's turn", 58, self.font_small, BLUE)

        self.draw_board()
        self.draw_marks()

        # Scoreboard
        score_y = BOARD_OFFSET_Y + BOARD_SIZE + 25
        score_text = f"X: {self.scores['X']}    O: {self.scores['O']}    Draws: {self.scores['Draw']}"
        self.draw_text_centered(score_text, score_y, self.font_small)

    def draw_game_over(self):
        self.screen.fill(WHITE)
        self.draw_board()
        self.draw_marks()
        self.draw_winning_line()

        msg_y = 30
        if self.winner == -1:
            self.draw_text_centered("It's a draw!", msg_y, self.font_large, GREEN)
        elif self.winner == 1:
            self.draw_text_centered("X wins!", msg_y, self.font_large, RED)
        else:
            self.draw_text_centered("O wins!", msg_y, self.font_large, BLUE)

        mouse_pos = pygame.mouse.get_pos()
        btn_y = BOARD_OFFSET_Y + BOARD_SIZE + 20
        self.btn_again = pygame.Rect(30, btn_y, 160, 45)
        self.btn_menu = pygame.Rect(210, btn_y, 160, 45)
        self.draw_button("Play Again", self.btn_again, self.btn_again.collidepoint(mouse_pos))
        self.draw_button("Main Menu", self.btn_menu, self.btn_menu.collidepoint(mouse_pos))

        score_y = btn_y + 60
        score_text = f"X: {self.scores['X']}    O: {self.scores['O']}    Draws: {self.scores['Draw']}"
        self.draw_text_centered(score_text, score_y, self.font_small)

    def handle_menu_event(self, event):
        if event.type == pygame.MOUSEBUTTONDOWN and event.button == 1:
            if self.btn_1p.collidepoint(event.pos):
                self.two_player = False
                self.reset_board()
                self.state = STATE_PLAYING
            elif self.btn_2p.collidepoint(event.pos):
                self.two_player = True
                self.reset_board()
                self.state = STATE_PLAYING

    def handle_playing_event(self, event):
        if event.type == pygame.MOUSEBUTTONDOWN and event.button == 1:
            cell = self.cell_from_mouse(event.pos)
            if cell is not None and self.board[cell] == 0:
                self.make_move(cell)
                if self.check_winner():
                    self.end_game()
                    return
                self.current_player = 3 - self.current_player  # toggle 1<->2

                # AI move
                if not self.two_player and self.current_player == 2:
                    ai_cell = self.computer_move()
                    if ai_cell is not None:
                        self.board[ai_cell] = 2
                        if self.check_winner():
                            self.end_game()
                            return
                        self.current_player = 1

    def end_game(self):
        if self.winner == 1:
            self.scores["X"] += 1
        elif self.winner == 2:
            self.scores["O"] += 1
        else:
            self.scores["Draw"] += 1
        self.state = STATE_GAME_OVER

    def handle_game_over_event(self, event):
        if event.type == pygame.MOUSEBUTTONDOWN and event.button == 1:
            if self.btn_again.collidepoint(event.pos):
                self.reset_board()
                self.state = STATE_PLAYING
            elif self.btn_menu.collidepoint(event.pos):
                self.reset_board()
                self.state = STATE_MENU

    def run(self):
        while True:
            for event in pygame.event.get():
                if event.type == pygame.QUIT:
                    pygame.quit()
                    sys.exit()

                if self.state == STATE_MENU:
                    self.handle_menu_event(event)
                elif self.state == STATE_PLAYING:
                    self.handle_playing_event(event)
                elif self.state == STATE_GAME_OVER:
                    self.handle_game_over_event(event)

            if self.state == STATE_MENU:
                self.draw_menu()
            elif self.state == STATE_PLAYING:
                self.draw_playing()
            elif self.state == STATE_GAME_OVER:
                self.draw_game_over()

            pygame.display.flip()
            self.clock.tick(60)


if __name__ == "__main__":
    game = TicTacToe()
    game.run()
