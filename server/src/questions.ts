import { Question } from "./types.js";

/**
 * Fisher-Yates shuffle — returns a new array, does not mutate the input.
 */
export function shuffle<T>(input: readonly T[]): T[] {
  const arr = [...input];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export const questions: Question[] = [
  { question: "¿Quién pide lo más caro y luego busca excusas para dividir la cuenta?", hot: false },
  { question: "¿Quién es el más resentido y rencoroso del grupo?", hot: false },
  { question: "¿Quién es el primero en huir y abandonar al resto cuando hay problemas?", hot: false },
  { question: "¿Quién tiene el peor gusto para vestirse?", hot: false },
  { question: "¿Quién de nosotros es una mala persona en secreto?", hot: false },
  { question: "¿Quién de nosotros no tiene empatía?", hot: false },
  { question: "¿Quién pide dinero prestado sabiendo que jamás lo va a devolver?", hot: false },
  { question: "¿De quién de nosotros jamás tocarías su ropa interior?", hot: false },
  { question: "¿Quién sería el político más corrupto?", hot: false },
  { question: "¿Quién tiene más probabilidades de terminar con alguien que aún es menor de edad?", hot: false },
  { question: "¿Quién es el más asqueroso?", hot: false },
  { question: "¿Quién tiene cara de delincuente?", hot: false },
  { question: "Si nos sacamos la lotería, ¿quién sería el primero en malgastar todo y quedar en la miseria?", hot: false },
  { question: "¿Quién de nosotros tiene la peor higiene personal?", hot: false },
  { question: "¿Quién es el más impulsivo e inmaduro?", hot: false },
  { question: "¿Quién de nosotros no cumple sus promesas?", hot: false },
  { question: "Si la policía nos interroga por un crimen, ¿quién nos delata?", hot: false },
  { question: "¿Quién de nosotros acosa a sus ex?", hot: false },
  { question: "¿Quién de nosotros es el más mantenido y dependiente de sus padres?", hot: false }, // Cambiada por la rota de travesti
  { question: "Un amigo necesita dadores de sangre urgentes. ¿Quién finge que fue pero no donó nada?", hot: false }, // Cambiada por opiniones ideológicas aburridas
  { question: "Si estuviéramos en una película de terror, ¿quién sería el primero en morir?", hot: false },
  { question: "¿Quién es el amigo más falso del grupo?", hot: false },
  { question: "¿A quién evitas escuchar porque te aburre?", hot: false },
  { question: "¿Quién no tiene ningún talento?", hot: false },
  { question: "¿Quién de nosotros envejecerá solo, triste y olvidado?", hot: false },
  { question: "¿Quién no tiene la más mínima capacidad para dar órdenes ni liderar?", hot: false }, // Cambiada por jefe repetido
  { question: "De todo el grupo, ¿quién es físicamente el más feo?", hot: false }, // Corregida la rota de "tiene el mas feo"
  { question: "¿Quién de nosotros está envejeciendo peor?", hot: false },
  { question: "¿Quién está metido en los negocios más turbios?", hot: false },
  { question: "¿Quién tiene los fetiches más desagradables?", hot: false },
  { question: "¿Quién tuvo una infancia disfuncional?", hot: false },
  { question: "Si colapsa la tecnología, ¿quién sería el primero en volverse loco?", hot: false }, // Subida de posición para balancear
  { question: "¿Quién es mala copa?", hot: false },
  { question: "Si estuvieras en una crisis grave, ¿de quién jamás aceptarías un consejo?", hot: false }, // Subida de posición
  { question: "¿A quién de nosotros jamás le confiarías la vida de un hijo?", hot: false },
  { question: "¿Quién es un niño atrapado en el cuerpo de un adulto?", hot: false },
  { question: "¿Quién se cree inteligente pero en realidad es un ignorante?", hot: false }, // Eliminado término ofensivo obsoleto
  { question: "¿Quién de nosotros da más lástima cuando intenta llamar la atención?", hot: false },
  { question: "¿Quién es el más cobarde?", hot: false },
  { question: "Si pudieras golpear a alguien del grupo en la cara sin consecuencias, ¿a quién elegirías?", hot: false },
  { question: "Si el grupo se entera de un chisme íntimo, ¿quién corre a contarle a los demás?", hot: false }, // Reemplaza repetido de superioridad
  { question: "¿Quién es el más egocéntrico e interesado del grupo?", hot: false },
  { question: "¿Quién de nosotros parece odiar más su propia vida?", hot: false },
  { question: "¿Quién cree en las teorías conspirativas más ridículas?", hot: false },
  { question: "¿Quién de nosotros es el más ignorante?", hot: false },
  { question: "¿Quién es el más lento para entender instrucciones simples?", hot: false },
  { question: "Al planear un viaje, ¿quién cancela siempre a último momento?", hot: false }, // Cortada para ser más directa
  { question: "¿Quién de nosotros es más probable que tenga un hijo regado por ahí?", hot: false },
  { question: "¿Quién de nosotros lleva una doble vida?", hot: false },
  { question: "¿Quién sería capaz de vender un secreto tuyo por un beneficio propio?", hot: false }, // Reemplaza chismoso repetido
  { question: "¿Quién no tiene ética?", hot: false },
  { question: "¿Quién es el más obsesionado con su apariencia física?", hot: false },
  { question: "¿Quién sería el jefe más explotador y miserable?", hot: false },
  { question: "Si nos quedamos sin comida, ¿quién nos comería primero?", hot: false }, // Subida por flujo
  { question: "¿Quién de nosotros le desea secretamente el mal al resto?", hot: false },
  { question: "¿Quién está fingiendo ser tu amigo en este juego pero te odia?", hot: false },
  { question: "¿Quién rompería cualquier regla o ley por puro egoísmo?", hot: false },
  { question: "¿A quién no le confías jamás las llaves de tu auto?", hot: false },
  { question: "¿Quién de nosotros es el menos capacitado para liderar cualquier cosa?", hot: false },
  { question: "¿Quién del grupo es el más propenso a apuñalarte por la espalda?", hot: false },
  { question: "¿Quién vendería su dignidad o a sus amigos por dinero?", hot: false },
  { question: "Si hay que salvar solo a uno, ¿quién dejaría morir a todos los demás sin culpa?", hot: false },
  { question: "¿La vida de quién de nosotros vale menos para el mundo?", hot: false },
  { question: "¿Quién reacciona con violencia física o verbal cuando pierde el control?", hot: false },
  { question: "Si tuvieras que eliminar a alguien del grupo para siempre de tu vida, ¿a quién elegirías?", hot: false }, // Subida
  { question: "¿Quién es el eslabón más débil del grupo?", hot: false },
  { question: "¿Quién de nosotros se frustra y se amarga cuando a los demás les va bien?", hot: false }, // Ajustada envidia
  { question: "¿Quién tiene los prejuicios sociales más retrógrados y discriminatorios?", hot: false }, // Ajustada racista/homofóbico
  { question: "¿Quién te felicita por tus logros de frente pero te sabotea por la espalda?", hot: false }, // Reemplaza saboteador repetido
  { question: "¿Quién de nosotros es un parásito social que vive del esfuerzo ajeno?", hot: false },
  { question: "¿Quién de nosotros carece totalmente de moral o valores?", hot: false },
  { question: "¿Quién sería el primero en apoyar medidas crueles o inhumanas si tuviera poder?", hot: false },
  { question: "¿Quién del grupo es el que más juzga y critica a los demás por la espalda?", hot: false },
  { question: "¿Quién nos abandonaría por completo si consiguiera dinero o éxito?", hot: false },
  { question: "¿Quién disfruta ver sufrir o fracasar a sus propios amigos?", hot: false },
  { question: "Si tuviéramos que elegir a alguien para que no vuelva nunca más, ¿a quién sería?", hot: false }, // Reemplaza vida falsa repetida
  { question: "¿Quién de nosotros es el más cruel e hiriente con sus comentarios?", hot: true },
  { question: "Si pudieras borrar la existencia de alguien del grupo, ¿la de quién sería?", hot: false },
  { question: "¿Quién vendería su alma por dinero?", hot: true },
  { question: "¿Quién está obsesionado en secreto con alguien del grupo que lo ignora?", hot: true },
  { question: "¿Quién de nosotros es el más aburrido en la cama?", hot: true }, // Quitado "cogiendo" por neutralidad de verbo
  { question: "¿Quién caería en la humillación más denigrante con tal de no pasar la noche solo?", hot: true }, // Corregido error y distanciado de desesperado
  { question: "¿Quién de nosotros es el más reemplazable e insignificante del grupo?", hot: false },
  { question: "¿Quién del grupo da más lástima por andar mendigando atención y afecto?", hot: true }, // Reemplaza desesperado/coger repetido
  { question: "¿El historial de búsqueda de quién causaría repulsión total si se hiciera público?", hot: true },
  { question: "¿A quién del grupo jamás dejarías quedarse a solas con tu pareja?", hot: true },
  { question: "¿Quién de nosotros es capaz de intimar con un animal por curiosidad morbosa?", hot: true }, // Ajustada la del animal
  { question: "¿Quién es tan promiscuo e irresponsable que terminará con una enfermedad incurable?", hot: true }, // Ajustada la del sida para ser más abierta
  { question: "¿La cara de quién del grupo te arruinaría por completo el deseo íntimo?", hot: true },
  { question: "¿Quién cometería incesto por un millón de dólares?", hot: true },
  { question: "¿Quién de nosotros es el más reprimido en su vida íntima?", hot: true },
  { question: "¿Quién sería capaz de acostarse con la pareja de su mejor amigo por puro capricho?", hot: true }, // Reemplaza repetido de casado/ex
  { question: "¿Quién tiene fantasías íntimas con personas que le duplican o triplican la edad?", hot: true },
  { question: "Si la clonación fuera real, ¿quién se acostaría con su propio clon?", hot: true }, // Ajustado verbo
  { question: "Si el sexo grupal fuera la única opción para salvarse, ¿a quién dejarían fuera?", hot: true }, // Reemplaza repetido de "a quién te cogerías"
  { question: "¿El cuerpo de quién de nosotros da menos ganas de ver sin ropa?", hot: true },
  { question: "¿A quién del grupo rechazarías de forma inmediata si te propusiera algo íntimo?", hot: true }, // Reemplaza el "no te cogerías" repetido
  { question: "¿Quién de nosotros oculta que pasa horas consumiendo el porno más bizarro?", hot: true }, // Reemplaza adicto al porno/onlyfans repetido
  { question: "¿Quién mintió sobre su experiencia íntima solo para quedar bien?", hot: true },
  { question: "¿Quién se masturba pensando en algún miembro del grupo?", hot: true },
  { question: "¿Quién se acostaría con la madre o el padre de un amigo?", hot: true }, // Unificada la de los padres
];