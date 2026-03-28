/**
 * 新纪元英语词汇系统 - 默认教材词表
 * 基于人教版七年级上册英语教材
 */

const DEFAULT_WORDLISTS = {
    // 年级列表
    grades: ['七年级', '八年级', '九年级'],
    
    // 七年级上册 Units 1-9
    '七年级上册': {
        'Starter Unit 1': ['good', 'morning', 'hi', 'hello', 'afternoon', 'evening', 'how', 'are', 'you', 'I', 'am', 'is', 'OK', 'fine', 'thanks'],
        'Starter Unit 2': ['what', 'is', 'this', 'that', 'in', 'English', 'map', 'cup', 'ruler', 'pen', 'orange', 'jacket', 'key', 'quilt', 'it', 'a', 'an'],
        'Starter Unit 3': ['color', 'red', 'yellow', 'green', 'blue', 'black', 'white', 'purple', 'brown', 'the', 'now', 'see', 'can', 'say', 'my'],
        'Unit 1': ['name', 'nice', 'to', 'meet', 'too', 'your', 'Ms', 'his', 'and', 'her', 'yes', 'she', 'he', 'no', 'not'],
        'Unit 2': ['sister', 'mother', 'father', 'parent', 'brother', 'grandmother', 'grandfather', 'grandparent', 'family', 'those', 'who', 'these', 'they', 'well', 'have', 'day', 'bye', 'son', 'cousin', 'grandpa', 'grandma', 'dad', 'mom', 'uncle', 'aunt', 'daughter', 'here', 'photo', 'of', 'next', 'picture', 'girl', 'dog'],
        'Unit 3': ['pencil', 'book', 'eraser', 'box', 'schoolbag', 'dictionary', 'his', 'mine', 'hers', 'excuse', 'me', 'thank', 'teacher', 'about', 'yours', 'for', 'help', 'welcome', 'baseball', 'watch', 'computer', 'game', 'card', 'ID', 'notebook', 'ring', 'bag', 'in', 'library', 'ask', 'some', 'classroom', 'e-mail', 'at', 'call', 'lost', 'must', 'set'],
        'Unit 4': ['where', 'table', 'bed', 'bookcase', 'sofa', 'chair', 'on', 'under', 'come', 'desk', 'think', 'room', 'their', 'hat', 'head', 'know', 'radio', 'clock', 'tape', 'player', 'model', 'plane', 'tidy', 'but', 'our', 'everywhere', 'always'],
        'Unit 5': ['do', 'have', 'tennis', 'ball', 'ping-pong', 'bat', 'soccer', 'volleyball', 'basketball', 'let', 'us', 'go', 'we', 'late', 'get', 'great', 'play', 'sound', 'interesting', 'boring', 'fun', 'difficult', 'relaxing', 'watch', 'TV', 'same', 'love', 'with', 'sport', 'them', 'only', 'like', 'easy', 'after', 'class', 'classmate'],
        'Unit 6': ['banana', 'hamburger', 'tomato', 'ice-cream', 'salad', 'strawberry', 'pear', 'milk', 'bread', 'birthday', 'dinner', 'week', 'think', 'about', 'food', 'sure', 'How', 'burger', 'vegetable', 'fruit', 'right', 'apple', 'then', 'egg', 'carrot', 'rice', 'chicken', 'so', 'breakfast', 'lunch', 'star', 'eat', 'well', 'habit', 'healthy', 'really', 'question', 'want', 'be', 'fat'],
        'Unit 7': ['much', 'sock', 'T-shirt', 'shorts', 'sweater', 'trousers', 'shoe', 'skirt', 'dollar', 'big', 'small', 'short', 'long', 'woman', 'need', 'look', 'pair', 'take', 'ten', 'eleven', 'twelve', 'thirteen', 'fifteen', 'eighteen', 'twenty', 'thirty', 'Mr', 'price', 'store', 'sale', 'sell', 'all', 'very', 'buy', 'clothes', 'for', 'sorry'],
        'Unit 8': ['when', 'month', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December', 'happy', 'old', 'party', 'first', 'second', 'third', 'fifth', 'eighth', 'ninth', 'twelfth', 'twentieth', 'test', 'trip', 'art', 'festival', 'dear', 'student', 'thing', 'term', 'busy', 'time', 'there'],
        'Unit 9': ['favorite', 'subject', 'science', 'P.E.', 'music', 'math', 'Chinese', 'geography', 'history', 'why', 'because', 'Monday', 'Friday', 'Saturday', 'for', 'sure', 'free', 'cool', 'useful', 'from', 'from...to', 'Mrs', 'finish', 'lesson', 'hour']
    },
    
    // 七年级下册 Units 1-12
    '七年级下册': {
        'Unit 1': ['can', 'play', 'the', 'guitar', 'swim', 'dance', 'draw', 'chess', 'speak', 'join', 'club', 'tell', 'story', 'write', 'show', 'or', 'talk', 'kung', 'fu', 'drum', 'piano', 'violin', 'also', 'people', 'home', 'make', 'today', 'center', 'weekend', 'teach', 'musician'],
        'Unit 2': ['up', 'get', 'dress', 'brush', 'tooth', 'shower', 'usually', 'forty', 'wow', 'never', 'early', 'fifty', 'job', 'work', 'station', 'radio', 'o\'clock', 'night', 'funny', 'exercise', 'best', 'group', 'half', 'past', 'quarter', 'homework', 'run', 'walk', 'clean', 'quickly', 'either', 'lot', 'sometimes', 'taste', 'life'],
        'Unit 3': ['train', 'bus', 'subway', 'ride', 'bike', 'sixty', 'seventy', 'eighty', 'ninety', 'hundred', 'minute', 'far', 'kilometer', 'new', 'every', 'drive', 'live', 'stop', 'cross', 'river', 'many', 'village', 'between', 'bridge', 'boat', 'ropeway', 'year', 'afraid', 'like', 'villager', 'leave', 'dream', 'true', 'come'],
        'Unit 4': ['rule', 'arrive', 'hallway', 'hall', 'dining', 'listen', 'fight', 'sorry', 'outside', 'wear', 'important', 'bring', 'uniform', 'quiet', 'out', 'go', 'practice', 'dish', 'before', 'make', 'bed', 'dirty', 'kitchen', 'more', 'noisy', 'relax', 'read', 'terrible', 'feel', 'strict', 'remember', 'follow', 'luck', 'keep', 'hair', 'learn'],
        'Unit 5': ['panda', 'zoo', 'tiger', 'elephant', 'koala', 'lion', 'giraffe', 'animal', 'cute', 'lazy', 'smart', 'beautiful', 'scary', 'kind', 'kind', 'Australia', 'south', 'Africa', 'pet', 'leg', 'cat', 'sleep', 'friendly', 'shy', 'save', 'symbol', 'flag', 'forget', 'place', 'water', 'danger', 'cut', 'down', 'tree', 'kill', 'ivory', 'over'],
        'Unit 6': ['newspaper', 'use', 'soup', 'wash', 'movie', 'just', 'eat', 'house', 'drink', 'tea', 'tomorrow', 'pool', 'shop', 'supermarket', 'man', 'race', 'study', 'state', 'American', 'young', 'child', 'miss', 'wish', 'delicious', 'still', 'newspaper', 'use', 'soup', 'wash', 'movie', 'just', 'eat', 'house', 'drink', 'tea', 'tomorrow', 'pool', 'shop', 'supermarket', 'man', 'race', 'study', 'state', 'American', 'young', 'child', 'miss', 'wish', 'delicious', 'still'],
        'Unit 7': ['rain', 'windy', 'cloudy', 'sunny', 'snow', 'weather', 'cook', 'bad', 'park', 'message', 'take', 'him', 'could', 'back', 'problem', 'again', 'dry', 'cold', 'hot', 'warm', 'visit', 'Canada', 'summer', 'sit', 'juice', 'soon', 'vacation', 'hard', 'Europe', 'mountain', 'country', 'skate', 'snowy', 'winter', 'Russian', 'snowman', 'rainy'],
        'Unit 8': ['post', 'office', 'police', 'hotel', 'restaurant', 'bank', 'hospital', 'street', 'pay', 'near', 'across', 'front', 'behind', 'town', 'around', 'north', 'along', 'turn', 'right', 'left', 'crossing', 'neighborhood', 'spend', 'climb', 'road', 'often', 'air', 'sunshine', 'free', 'enjoy', 'easily', 'money'],
        'Unit 9': ['curly', 'straight', 'tall', 'medium', 'height', 'thin', 'heavy', 'build', 'tonight', 'little', 'cinema', 'glasses', 'later', 'handsome', 'actor', 'actress', 'person', 'nose', 'blonde', 'mouth', 'round', 'face', 'eye', 'singer', 'artist', 'crime', 'criminal', 'put', 'each', 'way', 'describe', 'differently', 'another', 'end', 'real', 'jeans'],
        'Unit 10': ['noodle', 'mutton', 'beef', 'cabbage', 'potato', 'special', 'would', 'yet', 'large', 'order', 'bowl', 'size', 'tofu', 'meat', 'dumpling', 'porridge', 'onion', 'pancake', 'fish', 'rice', 'world', 'answer', 'different', 'cake', 'candle', 'age', 'blow', 'if', 'will', 'candy', 'lucky', 'popular', 'idea'],
        'Unit 11': ['milk', 'shake', 'blender', 'turn', 'peel', 'pour', 'yogurt', 'honey', 'watermelon', 'spoon', 'add', 'finally', 'salt', 'sugar', 'cheese', 'popcorn', 'corn', 'machine', 'sandwich', 'butter', 'turkey', 'lettuce', 'piece', 'Thanksgiving', 'traditional', 'autumn', 'traveler', 'England', 'celebrate', 'mix', 'pepper', 'fill', 'oven', 'plate', 'cover', 'gravy', 'serve', 'temperature'],
        'Unit 12': ['camp', 'lake', 'beach', 'badminton', 'sheep', 'as', 'natural', 'butterfly', 'visitor', 'tired', 'stay', 'away', 'mouse', 'baby', 'shout', 'start', 'jump', 'wake', 'high', 'ago', 'India', 'tent', 'moon', 'surprise', 'snake', 'scared', 'move', 'shout', 'into', 'forest', 'ear']
    }
};

// 导出供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DEFAULT_WORDLISTS;
}
