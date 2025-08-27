/* eslint-disable @typescript-eslint/explicit-function-return-type */
import classNames from 'classnames'
import { twMerge } from 'tailwind-merge'

export const cx = (...value: Parameters<typeof classNames>) => twMerge(classNames(value))
